-- ============================================
-- 1. CHAT: messages + read receipts
-- ============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT,
  image_url TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (content IS NOT NULL OR image_url IS NOT NULL)
);
CREATE INDEX idx_messages_mess_created ON public.messages(mess_id, created_at DESC);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mess members view messages"
ON public.messages FOR SELECT TO authenticated
USING (mess_id = public.get_user_mess_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "mess members send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND mess_id = public.get_user_mess_id(auth.uid())
);

CREATE POLICY "sender or admin updates messages"
ON public.messages FOR UPDATE TO authenticated
USING (
  sender_id = auth.uid()
  OR public.is_mess_admin_of(auth.uid(), mess_id)
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  sender_id = auth.uid()
  OR public.is_mess_admin_of(auth.uid(), mess_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "sender or admin deletes messages"
ON public.messages FOR DELETE TO authenticated
USING (
  sender_id = auth.uid()
  OR public.is_mess_admin_of(auth.uid(), mess_id)
  OR public.is_super_admin(auth.uid())
);

CREATE TRIGGER messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- read receipts
CREATE TABLE public.message_reads (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX idx_message_reads_user ON public.message_reads(user_id);
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view reads in own mess"
ON public.message_reads FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reads.message_id
      AND (m.mess_id = public.get_user_mess_id(auth.uid()) OR public.is_super_admin(auth.uid()))
  )
);

CREATE POLICY "mark own reads"
ON public.message_reads FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================
-- 2. JOIN REQUESTS via mess key
-- ============================================
CREATE TYPE public.join_request_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id UUID NOT NULL,
  user_id UUID NOT NULL,
  requested_name TEXT NOT NULL,
  requested_phone TEXT NOT NULL,
  message TEXT,
  status public.join_request_status NOT NULL DEFAULT 'pending',
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_join_requests_mess_status ON public.join_requests(mess_id, status);
CREATE UNIQUE INDEX uniq_pending_join_request ON public.join_requests(user_id, mess_id) WHERE status = 'pending';
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own or admin join requests"
ON public.join_requests FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_mess_admin_of(auth.uid(), mess_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "insert own join request"
ON public.join_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin updates join requests"
ON public.join_requests FOR UPDATE TO authenticated
USING (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()))
WITH CHECK (public.is_mess_admin_of(auth.uid(), mess_id) OR public.is_super_admin(auth.uid()));

-- ============================================
-- 3. STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars','avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images','chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- avatars policies
CREATE POLICY "avatars publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- chat-images policies
CREATE POLICY "chat images publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

CREATE POLICY "users upload chat images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "users delete own chat images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 4. REALTIME
-- ============================================
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_reads REPLICA IDENTITY FULL;
ALTER TABLE public.join_requests REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.join_requests;