ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notices_emergency
  ON public.notices(mess_id, is_emergency, created_at DESC)
  WHERE is_emergency = true;

CREATE TABLE IF NOT EXISTS public.notice_acks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notice_id UUID NOT NULL,
  user_id UUID NOT NULL,
  acked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(notice_id, user_id)
);

ALTER TABLE public.notice_acks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own ack"
  ON public.notice_acks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users view own ack"
  ON public.notice_acks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.notices n
    WHERE n.id = notice_acks.notice_id
      AND (public.is_mess_admin_of(auth.uid(), n.mess_id) OR public.is_super_admin(auth.uid()))
  ));