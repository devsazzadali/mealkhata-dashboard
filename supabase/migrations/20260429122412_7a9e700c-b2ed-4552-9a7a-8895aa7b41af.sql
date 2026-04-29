-- Mess settings: per-mess configuration
CREATE TABLE IF NOT EXISTS public.mess_settings (
  mess_id UUID PRIMARY KEY REFERENCES public.messes(id) ON DELETE CASCADE,
  default_meal_rate NUMERIC NOT NULL DEFAULT 0,
  low_balance_threshold NUMERIC NOT NULL DEFAULT 100,
  bkash_number TEXT,
  nagad_number TEXT,
  bank_info TEXT,
  join_key TEXT NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mess_settings_join_key_idx ON public.mess_settings(join_key);

ALTER TABLE public.mess_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view mess settings"
  ON public.mess_settings FOR SELECT TO authenticated
  USING (mess_id = public.get_user_mess_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "mess admin manage settings"
  ON public.mess_settings FOR ALL TO authenticated
  USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER mess_settings_set_updated_at
  BEFORE UPDATE ON public.mess_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create settings row for every mess (existing + future)
INSERT INTO public.mess_settings (mess_id)
SELECT id FROM public.messes
ON CONFLICT (mess_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.tg_create_mess_settings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.mess_settings (mess_id) VALUES (NEW.id)
  ON CONFLICT (mess_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messes_create_settings
  AFTER INSERT ON public.messes
  FOR EACH ROW EXECUTE FUNCTION public.tg_create_mess_settings();