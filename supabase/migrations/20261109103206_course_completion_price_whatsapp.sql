-- Instructor-confirmed AgriAcademy price, plus optional WhatsApp completion shares.
-- Reuses whatsapp_connections and whatsapp_saved_groups. sent means WaAPI accepted the text.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS price_confirmed BOOLEAN NOT NULL DEFAULT false;

UPDATE public.courses
SET price_confirmed = true
WHERE status IN ('published', 'paused')
  AND price_confirmed = false;

CREATE TABLE IF NOT EXISTS public.whatsapp_course_publications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  client_request_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'sent', 'failed', 'partially_sent')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_whatsapp_course_publication_request UNIQUE (user_id, client_request_id),
  CONSTRAINT ck_whatsapp_course_publication_request CHECK (char_length(client_request_id) BETWEEN 16 AND 80)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_course_publications_user_created
  ON public.whatsapp_course_publications (user_id, created_at DESC);

DROP TRIGGER IF EXISTS tr_whatsapp_course_publications_updated_at ON public.whatsapp_course_publications;
CREATE TRIGGER tr_whatsapp_course_publications_updated_at
  BEFORE UPDATE ON public.whatsapp_course_publications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.whatsapp_course_publication_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_id UUID NOT NULL REFERENCES public.whatsapp_course_publications(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  whatsapp_group_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'sent', 'failed')
  ),
  provider_message_id TEXT,
  error_code TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_whatsapp_course_publication_group UNIQUE (publication_id, whatsapp_group_id),
  CONSTRAINT ck_whatsapp_course_publication_group CHECK (whatsapp_group_id ~ '^[A-Za-z0-9_-]{5,120}@g\.us$')
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_course_publication_targets_publication
  ON public.whatsapp_course_publication_targets (publication_id, status);

DROP TRIGGER IF EXISTS tr_whatsapp_course_publication_targets_updated_at ON public.whatsapp_course_publication_targets;
CREATE TRIGGER tr_whatsapp_course_publication_targets_updated_at
  BEFORE UPDATE ON public.whatsapp_course_publication_targets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.whatsapp_course_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_course_publication_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_course_publications_select_own ON public.whatsapp_course_publications;
CREATE POLICY whatsapp_course_publications_select_own
  ON public.whatsapp_course_publications
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.profiles
      WHERE clerk_user_id = public.current_clerk_user_id()
    )
  );

DROP POLICY IF EXISTS whatsapp_course_publication_targets_select_own ON public.whatsapp_course_publication_targets;
CREATE POLICY whatsapp_course_publication_targets_select_own
  ON public.whatsapp_course_publication_targets
  FOR SELECT
  TO authenticated
  USING (
    publication_id IN (
      SELECT p.id
      FROM public.whatsapp_course_publications p
      JOIN public.profiles pr ON pr.id = p.user_id
      WHERE pr.clerk_user_id = public.current_clerk_user_id()
    )
  );

REVOKE ALL ON TABLE public.whatsapp_course_publications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.whatsapp_course_publication_targets FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id, user_id, course_id, connection_id, status, created_at, updated_at
) ON TABLE public.whatsapp_course_publications TO authenticated;

GRANT SELECT (
  id, publication_id, whatsapp_group_id, group_name, status,
  provider_message_id, error_code, sent_at, created_at, updated_at
) ON TABLE public.whatsapp_course_publication_targets TO authenticated;
