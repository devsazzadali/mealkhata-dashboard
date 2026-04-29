
-- Monthly accounting periods (one per mess per month)
CREATE TABLE public.monthly_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  total_meals NUMERIC NOT NULL DEFAULT 0,
  total_expense NUMERIC NOT NULL DEFAULT 0,
  total_deposit NUMERIC NOT NULL DEFAULT 0,
  meal_rate NUMERIC NOT NULL DEFAULT 0,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mess_id, year, month)
);

ALTER TABLE public.monthly_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mess view periods" ON public.monthly_periods
  FOR SELECT TO authenticated
  USING (mess_id = public.get_user_mess_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "mess admin manage periods" ON public.monthly_periods
  FOR ALL TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER monthly_periods_updated_at
  BEFORE UPDATE ON public.monthly_periods
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Helper: live meal-rate stats for a given mess + month
CREATE OR REPLACE FUNCTION public.get_month_stats(_mess_id UUID, _year INT, _month INT)
RETURNS TABLE (
  total_meals NUMERIC,
  total_expense NUMERIC,
  total_deposit NUMERIC,
  meal_rate NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  start_d DATE := make_date(_year, _month, 1);
  end_d   DATE := (make_date(_year, _month, 1) + INTERVAL '1 month')::DATE;
BEGIN
  SELECT COALESCE(SUM(breakfast + lunch + dinner), 0) INTO total_meals
  FROM public.meal_entries
  WHERE mess_id = _mess_id AND meal_date >= start_d AND meal_date < end_d;

  SELECT COALESCE(SUM(amount), 0) INTO total_expense
  FROM public.expenses
  WHERE mess_id = _mess_id AND expense_date >= start_d AND expense_date < end_d;

  SELECT COALESCE(SUM(amount), 0) INTO total_deposit
  FROM public.deposits
  WHERE mess_id = _mess_id AND deposit_date >= start_d AND deposit_date < end_d;

  meal_rate := CASE WHEN total_meals > 0 THEN total_expense / total_meals ELSE 0 END;
  RETURN NEXT;
END;
$$;

-- Helper: per-boarder monthly summary (meals, deposits) for the live preview
CREATE OR REPLACE FUNCTION public.get_boarder_month_summary(_mess_id UUID, _year INT, _month INT)
RETURNS TABLE (
  boarder_id UUID,
  full_name TEXT,
  meals NUMERIC,
  deposits NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  start_d DATE := make_date(_year, _month, 1);
  end_d   DATE := (make_date(_year, _month, 1) + INTERVAL '1 month')::DATE;
BEGIN
  RETURN QUERY
  SELECT b.id, b.full_name,
    COALESCE((SELECT SUM(breakfast + lunch + dinner) FROM public.meal_entries m
              WHERE m.boarder_id = b.id AND m.meal_date >= start_d AND m.meal_date < end_d), 0) AS meals,
    COALESCE((SELECT SUM(amount) FROM public.deposits d
              WHERE d.boarder_id = b.id AND d.deposit_date >= start_d AND d.deposit_date < end_d), 0) AS deposits
  FROM public.boarders b
  WHERE b.mess_id = _mess_id AND b.status = 'active';
END;
$$;

-- Close a month: lock rate, update every boarder's balance
CREATE OR REPLACE FUNCTION public.close_month(_mess_id UUID, _year INT, _month INT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_period_id UUID;
  v_total_meals NUMERIC;
  v_total_expense NUMERIC;
  v_total_deposit NUMERIC;
  v_rate NUMERIC;
  r RECORD;
BEGIN
  -- Permission check
  IF NOT (public.is_mess_admin_of(auth.uid(), _mess_id) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT total_meals, total_expense, total_deposit, meal_rate
    INTO v_total_meals, v_total_expense, v_total_deposit, v_rate
  FROM public.get_month_stats(_mess_id, _year, _month);

  INSERT INTO public.monthly_periods
    (mess_id, year, month, status, total_meals, total_expense, total_deposit, meal_rate, closed_at, closed_by)
  VALUES
    (_mess_id, _year, _month, 'closed', v_total_meals, v_total_expense, v_total_deposit, v_rate, now(), auth.uid())
  ON CONFLICT (mess_id, year, month) DO UPDATE
    SET status='closed', total_meals=EXCLUDED.total_meals, total_expense=EXCLUDED.total_expense,
        total_deposit=EXCLUDED.total_deposit, meal_rate=EXCLUDED.meal_rate,
        closed_at=now(), closed_by=auth.uid(), updated_at=now()
  RETURNING id INTO v_period_id;

  -- Apply (deposits - meals*rate) to each boarder's running balance
  FOR r IN SELECT * FROM public.get_boarder_month_summary(_mess_id, _year, _month) LOOP
    UPDATE public.boarders
       SET balance = balance + (r.deposits - (r.meals * v_rate)),
           updated_at = now()
     WHERE id = r.boarder_id;
  END LOOP;

  RETURN v_period_id;
END;
$$;
