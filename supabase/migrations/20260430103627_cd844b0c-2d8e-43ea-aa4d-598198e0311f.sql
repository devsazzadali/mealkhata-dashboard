
-- Meal requests table: boarders can request to turn meals on/off for a date
CREATE TABLE IF NOT EXISTS public.meal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL,
  boarder_id UUID NOT NULL,
  user_id UUID NOT NULL,
  request_date DATE NOT NULL,
  breakfast BOOLEAN NOT NULL DEFAULT false,
  lunch BOOLEAN NOT NULL DEFAULT false,
  dinner BOOLEAN NOT NULL DEFAULT false,
  guest INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_requests_mess_status ON public.meal_requests(mess_id, status);
CREATE INDEX IF NOT EXISTS idx_meal_requests_boarder ON public.meal_requests(boarder_id, request_date);

ALTER TABLE public.meal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boarder create own meal request"
ON public.meal_requests FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND boarder_id IN (SELECT id FROM public.boarders WHERE user_id = auth.uid())
);

CREATE POLICY "boarder view own meal requests"
ON public.meal_requests FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_mess_admin_of(auth.uid(), mess_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "boarder cancel own pending request"
ON public.meal_requests FOR DELETE TO authenticated
USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "admin manage meal requests"
ON public.meal_requests FOR UPDATE TO authenticated
USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_meal_requests_updated_at
BEFORE UPDATE ON public.meal_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.meal_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_requests;
