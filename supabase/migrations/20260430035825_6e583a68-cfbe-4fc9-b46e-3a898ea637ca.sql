
-- 1. Secure lookup function for join key (fixes "Invalid join key" bug)
CREATE OR REPLACE FUNCTION public.find_mess_by_join_key(_key text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mess_id FROM public.mess_settings
  WHERE lower(join_key) = lower(trim(_key))
  LIMIT 1;
$$;

-- 2. Gallery (mess photos)
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view gallery" ON public.gallery_items FOR SELECT
  USING (mess_id = get_user_mess_id(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "admin manage gallery" ON public.gallery_items FOR ALL
  USING (is_mess_admin_of(auth.uid(), mess_id) OR is_super_admin(auth.uid()))
  WITH CHECK (is_mess_admin_of(auth.uid(), mess_id) OR is_super_admin(auth.uid()));

-- 3. Bazar schedule (rotation of who does shopping)
CREATE TABLE IF NOT EXISTS public.bazar_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  boarder_id UUID NOT NULL REFERENCES public.boarders(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  notes TEXT,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mess_id, boarder_id, schedule_date)
);
ALTER TABLE public.bazar_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view bazar schedule" ON public.bazar_schedule FOR SELECT
  USING (mess_id = get_user_mess_id(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "admin manage bazar schedule" ON public.bazar_schedule FOR ALL
  USING (is_mess_admin_of(auth.uid(), mess_id) OR is_super_admin(auth.uid()))
  WITH CHECK (is_mess_admin_of(auth.uid(), mess_id) OR is_super_admin(auth.uid()));

-- 4. Feedback
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user create own feedback" ON public.feedback FOR INSERT
  WITH CHECK (user_id = auth.uid() AND mess_id = get_user_mess_id(auth.uid()));
CREATE POLICY "view feedback" ON public.feedback FOR SELECT
  USING (user_id = auth.uid() OR is_mess_admin_of(auth.uid(), mess_id) OR is_super_admin(auth.uid()));
CREATE POLICY "admin manage feedback" ON public.feedback FOR UPDATE
  USING (is_mess_admin_of(auth.uid(), mess_id) OR is_super_admin(auth.uid()));
CREATE POLICY "admin delete feedback" ON public.feedback FOR DELETE
  USING (is_mess_admin_of(auth.uid(), mess_id) OR is_super_admin(auth.uid()));

-- 5. Events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  location TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view events" ON public.events FOR SELECT
  USING (mess_id = get_user_mess_id(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "admin manage events" ON public.events FOR ALL
  USING (is_mess_admin_of(auth.uid(), mess_id) OR is_super_admin(auth.uid()))
  WITH CHECK (is_mess_admin_of(auth.uid(), mess_id) OR is_super_admin(auth.uid()));

-- 6. Ads / promotions
CREATE TABLE IF NOT EXISTS public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  link_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view ads" ON public.advertisements FOR SELECT
  USING (mess_id = get_user_mess_id(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "admin manage ads" ON public.advertisements FOR ALL
  USING (is_mess_admin_of(auth.uid(), mess_id) OR is_super_admin(auth.uid()))
  WITH CHECK (is_mess_admin_of(auth.uid(), mess_id) OR is_super_admin(auth.uid()));
