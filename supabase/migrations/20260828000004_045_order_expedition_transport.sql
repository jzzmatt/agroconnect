-- Link Commerce order expedition to the existing transport_requests lifecycle.
-- Standalone (non-order) transport requests remain valid: the new columns are nullable.

ALTER TABLE public.transport_requests
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.transport_requests
  ADD COLUMN IF NOT EXISTS seller_group_id UUID REFERENCES public.order_seller_groups(id) ON DELETE SET NULL;

ALTER TABLE public.transport_requests
  ADD COLUMN IF NOT EXISTS request_source TEXT;

ALTER TABLE public.transport_requests
  DROP CONSTRAINT IF EXISTS transport_requests_request_source_check;

ALTER TABLE public.transport_requests
  ADD CONSTRAINT transport_requests_request_source_check
  CHECK (request_source IS NULL OR request_source = 'order_expedition');

ALTER TABLE public.transport_requests
  DROP CONSTRAINT IF EXISTS transport_requests_order_expedition_refs_check;

ALTER TABLE public.transport_requests
  ADD CONSTRAINT transport_requests_order_expedition_refs_check
  CHECK (
    request_source IS DISTINCT FROM 'order_expedition'
    OR (order_id IS NOT NULL AND seller_group_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_transport_requests_order_id
  ON public.transport_requests(order_id);

CREATE INDEX IF NOT EXISTS idx_transport_requests_seller_group_id
  ON public.transport_requests(seller_group_id);

CREATE INDEX IF NOT EXISTS idx_transport_requests_request_source
  ON public.transport_requests(request_source);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_requests_active_seller_group
  ON public.transport_requests (seller_group_id)
  WHERE seller_group_id IS NOT NULL AND status IN ('pending', 'accepted');

ALTER TABLE public.order_seller_groups
  ADD COLUMN IF NOT EXISTS transport_request_id UUID REFERENCES public.transport_requests(id) ON DELETE SET NULL;

ALTER TABLE public.order_seller_groups
  ADD COLUMN IF NOT EXISTS transport_status TEXT;

ALTER TABLE public.order_seller_groups
  ADD COLUMN IF NOT EXISTS transport_provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.order_seller_groups
  DROP CONSTRAINT IF EXISTS order_seller_groups_transport_status_check;

ALTER TABLE public.order_seller_groups
  ADD CONSTRAINT order_seller_groups_transport_status_check
  CHECK (
    transport_status IS NULL
    OR transport_status IN ('requested', 'accepted', 'rejected', 'completed')
  );

CREATE INDEX IF NOT EXISTS idx_order_seller_groups_transport_request
  ON public.order_seller_groups(transport_request_id);

CREATE INDEX IF NOT EXISTS idx_order_seller_groups_transport_status
  ON public.order_seller_groups(transport_status);

-- Freeze order-link identity the same way customer/provider/pricing cannot change after insert.
CREATE OR REPLACE FUNCTION public.protect_transport_request_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.provider_id IS DISTINCT FROM OLD.provider_id
     OR NEW.transport_service_id IS DISTINCT FROM OLD.transport_service_id
     OR NEW.estimated_trip_price IS DISTINCT FROM OLD.estimated_trip_price
     OR NEW.estimated_load_price IS DISTINCT FROM OLD.estimated_load_price
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.seller_group_id IS DISTINCT FROM OLD.seller_group_id
     OR NEW.request_source IS DISTINCT FROM OLD.request_source
  THEN
    RAISE EXCEPTION 'transport request identity and pricing cannot be changed';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected', 'cancelled'))
      OR (OLD.status = 'accepted' AND NEW.status IN ('completed', 'cancelled'))
    ) THEN
      RAISE EXCEPTION 'invalid transport request status transition: % → %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
