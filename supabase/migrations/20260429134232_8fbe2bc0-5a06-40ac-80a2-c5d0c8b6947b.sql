-- Extra bill split method
DO $$ BEGIN
  CREATE TYPE public.bill_split_method AS ENUM ('equal', 'meal_ratio');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.monthly_bill_status AS ENUM ('unpaid', 'partial', 'paid');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Extra bills (electricity, gas, wifi, rent, etc.)
CREATE TABLE IF NOT EXISTS public.extra_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mess_id UUID NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  split_method public.bill_split_method NOT NULL DEFAULT 'equal',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extra_bills_mess_date ON public.extra_bills (mess_id, bill_date);

ALTER TABLE public.extra_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mess admin manage extra bills"
ON public.extra_bills FOR ALL TO authenticated
USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "mess view extra bills"
ON public.extra_bills FOR SELECT TO authenticated
USING (mess_id = public.get_user_mess_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_extra_bills_updated_at
BEFORE UPDATE ON public.extra_bills
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Monthly bills (per-boarder generated bill)
CREATE TABLE IF NOT EXISTS public.monthly_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mess_id UUID NOT NULL,
  boarder_id UUID NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_meals NUMERIC NOT NULL DEFAULT 0,
  meal_rate NUMERIC NOT NULL DEFAULT 0,
  meal_cost NUMERIC NOT NULL DEFAULT 0,
  extra_share NUMERIC NOT NULL DEFAULT 0,
  total_deposit NUMERIC NOT NULL DEFAULT 0,
  payable NUMERIC NOT NULL DEFAULT 0,
  paid NUMERIC NOT NULL DEFAULT 0,
  status public.monthly_bill_status NOT NULL DEFAULT 'unpaid',
  details JSONB,
  generated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mess_id, boarder_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_bills_mess_period ON public.monthly_bills (mess_id, year, month);

ALTER TABLE public.monthly_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mess admin manage monthly bills"
ON public.monthly_bills FOR ALL TO authenticated
USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "mess admin view monthly bills"
ON public.monthly_bills FOR SELECT TO authenticated
USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "boarder view own monthly bills"
ON public.monthly_bills FOR SELECT TO authenticated
USING (boarder_id IN (SELECT id FROM public.boarders WHERE user_id = auth.uid()));

CREATE TRIGGER trg_monthly_bills_updated_at
BEFORE UPDATE ON public.monthly_bills
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Function: generate monthly bills for a mess for a given year/month
CREATE OR REPLACE FUNCTION public.generate_monthly_bills(_mess_id UUID, _year INT, _month INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_d DATE := make_date(_year, _month, 1);
  end_d   DATE := (make_date(_year, _month, 1) + INTERVAL '1 month')::DATE;
  v_total_meals NUMERIC := 0;
  v_total_expense NUMERIC := 0;
  v_rate NUMERIC := 0;
  v_extra_equal_total NUMERIC := 0;
  v_extra_meal_total NUMERIC := 0;
  v_active_boarders INT := 0;
  r RECORD;
  v_count INT := 0;
  v_meal_cost NUMERIC;
  v_extra_share NUMERIC;
  v_deposit NUMERIC;
  v_payable NUMERIC;
BEGIN
  IF NOT (public.is_mess_admin_of(auth.uid(), _mess_id) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- meal rate from groceries/expenses
  SELECT COALESCE(SUM(breakfast + lunch + dinner), 0) INTO v_total_meals
  FROM public.meal_entries
  WHERE mess_id = _mess_id AND meal_date >= start_d AND meal_date < end_d;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_expense
  FROM public.expenses
  WHERE mess_id = _mess_id AND expense_date >= start_d AND expense_date < end_d;

  v_rate := CASE WHEN v_total_meals > 0 THEN v_total_expense / v_total_meals ELSE 0 END;

  -- Extra bills split totals
  SELECT COALESCE(SUM(amount), 0) INTO v_extra_equal_total
  FROM public.extra_bills
  WHERE mess_id = _mess_id AND bill_date >= start_d AND bill_date < end_d AND split_method = 'equal';

  SELECT COALESCE(SUM(amount), 0) INTO v_extra_meal_total
  FROM public.extra_bills
  WHERE mess_id = _mess_id AND bill_date >= start_d AND bill_date < end_d AND split_method = 'meal_ratio';

  SELECT COUNT(*) INTO v_active_boarders
  FROM public.boarders WHERE mess_id = _mess_id AND status = 'active';

  -- Per boarder
  FOR r IN
    SELECT b.id AS boarder_id,
           COALESCE((SELECT SUM(breakfast + lunch + dinner) FROM public.meal_entries m
                     WHERE m.boarder_id = b.id AND m.meal_date >= start_d AND m.meal_date < end_d), 0) AS meals,
           COALESCE((SELECT SUM(amount) FROM public.deposits d
                     WHERE d.boarder_id = b.id AND d.deposit_date >= start_d AND d.deposit_date < end_d), 0) AS deposits
    FROM public.boarders b
    WHERE b.mess_id = _mess_id AND b.status = 'active'
  LOOP
    v_meal_cost := r.meals * v_rate;
    v_extra_share :=
      CASE WHEN v_active_boarders > 0 THEN v_extra_equal_total / v_active_boarders ELSE 0 END
      + CASE WHEN v_total_meals > 0 THEN v_extra_meal_total * (r.meals / v_total_meals) ELSE 0 END;
    v_deposit := r.deposits;
    v_payable := v_meal_cost + v_extra_share - v_deposit;

    INSERT INTO public.monthly_bills
      (mess_id, boarder_id, year, month, total_meals, meal_rate, meal_cost, extra_share, total_deposit, payable, generated_by)
    VALUES
      (_mess_id, r.boarder_id, _year, _month, r.meals, v_rate, v_meal_cost, v_extra_share, v_deposit, v_payable, auth.uid())
    ON CONFLICT (mess_id, boarder_id, year, month) DO UPDATE
      SET total_meals = EXCLUDED.total_meals,
          meal_rate = EXCLUDED.meal_rate,
          meal_cost = EXCLUDED.meal_cost,
          extra_share = EXCLUDED.extra_share,
          total_deposit = EXCLUDED.total_deposit,
          payable = EXCLUDED.payable,
          updated_at = now();
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;