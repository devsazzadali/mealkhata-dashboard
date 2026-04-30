
CREATE TABLE public.daily_menus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mess_id UUID NOT NULL,
  menu_date DATE NOT NULL,
  breakfast TEXT NOT NULL DEFAULT '',
  lunch TEXT NOT NULL DEFAULT '',
  dinner TEXT NOT NULL DEFAULT '',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mess_id, menu_date)
);

ALTER TABLE public.daily_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mess admin manage daily menus"
ON public.daily_menus FOR ALL
TO authenticated
USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "mess members view daily menus"
ON public.daily_menus FOR SELECT
TO authenticated
USING ((mess_id = public.get_user_mess_id(auth.uid())) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_daily_menus_updated_at
BEFORE UPDATE ON public.daily_menus
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_daily_menus_mess_date ON public.daily_menus(mess_id, menu_date DESC);
