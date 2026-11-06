-- Individual WaAPI WhatsApp connections and the groups an owner chooses to keep.
-- One connection per profile, one WaAPI instance per connection, and no shared instance.
-- The webhook token and instance id are not granted to the browser roles.

CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.provider_profiles(id) ON DELETE SET NULL,
  waapi_instance_id TEXT NOT NULL,
  webhook_token TEXT NOT NULL,
  connected_phone_number TEXT,
  connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (
    connection_status IN (
      'qr_pending',
      'connecting',
      'connected',
      'disconnected',
      'auth_failure'
    )
  ),
  qr_version INTEGER NOT NULL DEFAULT 0,
  qr_requested_at TIMESTAMPTZ,
  chats_requested_at TIMESTAMPTZ,
  status_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_connected_at TIMESTAMPTZ,
  CONSTRAINT uq_whatsapp_connections_user UNIQUE (user_id),
  CONSTRAINT uq_whatsapp_connections_instance UNIQUE (waapi_instance_id),
  CONSTRAINT uq_whatsapp_connections_webhook UNIQUE (webhook_token),
  CONSTRAINT ck_whatsapp_webhook_token_length CHECK (char_length(webhook_token) >= 32),
  CONSTRAINT ck_whatsapp_instance_id CHECK (waapi_instance_id ~ '^[0-9]{1,20}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_connections_business
  ON public.whatsapp_connections (business_id)
  WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status
  ON public.whatsapp_connections (connection_status);

DROP TRIGGER IF EXISTS tr_whatsapp_connections_updated_at ON public.whatsapp_connections;
CREATE TRIGGER tr_whatsapp_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.whatsapp_saved_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  whatsapp_group_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  group_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_whatsapp_saved_groups UNIQUE (connection_id, whatsapp_group_id),
  CONSTRAINT ck_whatsapp_group_id CHECK (whatsapp_group_id ~ '^[A-Za-z0-9_-]{5,120}@g\.us$')
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_saved_groups_connection
  ON public.whatsapp_saved_groups (connection_id, is_active);

DROP TRIGGER IF EXISTS tr_whatsapp_saved_groups_updated_at ON public.whatsapp_saved_groups;
CREATE TRIGGER tr_whatsapp_saved_groups_updated_at
  BEFORE UPDATE ON public.whatsapp_saved_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_saved_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_connections_select_own ON public.whatsapp_connections;
CREATE POLICY whatsapp_connections_select_own
  ON public.whatsapp_connections
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.profiles
      WHERE clerk_user_id = public.current_clerk_user_id()
    )
  );

DROP POLICY IF EXISTS whatsapp_saved_groups_select_own ON public.whatsapp_saved_groups;
CREATE POLICY whatsapp_saved_groups_select_own
  ON public.whatsapp_saved_groups
  FOR SELECT
  TO authenticated
  USING (
    connection_id IN (
      SELECT c.id
      FROM public.whatsapp_connections c
      JOIN public.profiles p ON p.id = c.user_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
    )
  );

REVOKE ALL ON TABLE public.whatsapp_connections FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.whatsapp_saved_groups FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  user_id,
  business_id,
  connected_phone_number,
  connection_status,
  created_at,
  updated_at,
  last_connected_at
) ON TABLE public.whatsapp_connections TO authenticated;

GRANT SELECT (
  id,
  connection_id,
  whatsapp_group_id,
  group_name,
  group_image_url,
  is_active,
  created_at,
  updated_at
) ON TABLE public.whatsapp_saved_groups TO authenticated;
