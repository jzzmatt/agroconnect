-- AgriProduct WhatsApp publishing. Reuses whatsapp_connections and whatsapp_saved_groups.
-- A row is "sent" when WaAPI accepts the send. It is not marked delivered or read.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS transport_included BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.whatsapp_product_publications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  client_request_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'sent', 'failed', 'partially_sent')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_whatsapp_publication_request UNIQUE (user_id, client_request_id),
  CONSTRAINT ck_whatsapp_publication_request CHECK (char_length(client_request_id) BETWEEN 16 AND 80)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_publications_user_created
  ON public.whatsapp_product_publications (user_id, created_at DESC);

DROP TRIGGER IF EXISTS tr_whatsapp_product_publications_updated_at ON public.whatsapp_product_publications;
CREATE TRIGGER tr_whatsapp_product_publications_updated_at
  BEFORE UPDATE ON public.whatsapp_product_publications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.whatsapp_product_publication_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_id UUID NOT NULL REFERENCES public.whatsapp_product_publications(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  whatsapp_group_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'sent', 'failed')
  ),
  media_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    media_status IN ('pending', 'sent', 'failed', 'skipped')
  ),
  provider_message_id TEXT,
  error_code TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_whatsapp_publication_group UNIQUE (publication_id, whatsapp_group_id),
  CONSTRAINT ck_whatsapp_publication_group CHECK (whatsapp_group_id ~ '^[A-Za-z0-9_-]{5,120}@g\.us$')
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_publication_targets_publication
  ON public.whatsapp_product_publication_targets (publication_id, status);

DROP TRIGGER IF EXISTS tr_whatsapp_publication_targets_updated_at ON public.whatsapp_product_publication_targets;
CREATE TRIGGER tr_whatsapp_publication_targets_updated_at
  BEFORE UPDATE ON public.whatsapp_product_publication_targets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.whatsapp_product_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_product_publication_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_publications_select_own ON public.whatsapp_product_publications;
CREATE POLICY whatsapp_publications_select_own
  ON public.whatsapp_product_publications
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.profiles
      WHERE clerk_user_id = public.current_clerk_user_id()
    )
  );

DROP POLICY IF EXISTS whatsapp_publication_targets_select_own ON public.whatsapp_product_publication_targets;
CREATE POLICY whatsapp_publication_targets_select_own
  ON public.whatsapp_product_publication_targets
  FOR SELECT
  TO authenticated
  USING (
    publication_id IN (
      SELECT p.id
      FROM public.whatsapp_product_publications p
      JOIN public.profiles pr ON pr.id = p.user_id
      WHERE pr.clerk_user_id = public.current_clerk_user_id()
    )
  );

REVOKE ALL ON TABLE public.whatsapp_product_publications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.whatsapp_product_publication_targets FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id, user_id, product_id, connection_id, status, created_at, updated_at
) ON TABLE public.whatsapp_product_publications TO authenticated;

GRANT SELECT (
  id, publication_id, whatsapp_group_id, group_name, status, media_status,
  provider_message_id, error_code, sent_at, created_at, updated_at
) ON TABLE public.whatsapp_product_publication_targets TO authenticated;
