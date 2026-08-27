-- Fix-Phase-12: Transport request production hardening
-- - Snap provider/price from the published transport service on INSERT
-- - Freeze identity, notes, and pricing on UPDATE (status + updated_at only)
-- - Customer may cancel only while pending
-- - Assigned transporter may mutate only pending/accepted rows
-- - One open pending request per customer + service

CREATE OR REPLACE FUNCTION public.enforce_transport_request_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  svc RECORD;
BEGIN
  IF NEW.transport_service_id IS NULL THEN
    RAISE EXCEPTION 'transport request requires a published transport service';
  END IF;

  SELECT
    ts.provider_id,
    ts.price_per_trip,
    ts.price_per_load,
    ts.currency,
    ts.status
  INTO svc
  FROM public.transport_services ts
  WHERE ts.id = NEW.transport_service_id;

  IF NOT FOUND OR svc.status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'transport request requires a published transport service';
  END IF;

  NEW.provider_id := svc.provider_id;
  NEW.estimated_trip_price := svc.price_per_trip;
  NEW.estimated_load_price := svc.price_per_load;
  NEW.currency := COALESCE(svc.currency, 'AOA');
  NEW.status := 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_transport_requests_enforce_insert ON public.transport_requests;
CREATE TRIGGER tr_transport_requests_enforce_insert
  BEFORE INSERT ON public.transport_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_transport_request_insert();

CREATE OR REPLACE FUNCTION public.protect_transport_request_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  actor_clerk TEXT := auth.jwt() ->> 'sub';
  is_customer BOOLEAN := FALSE;
  is_transporter BOOLEAN := FALSE;
BEGIN
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.provider_id IS DISTINCT FROM OLD.provider_id
     OR NEW.transport_service_id IS DISTINCT FROM OLD.transport_service_id
     OR NEW.estimated_trip_price IS DISTINCT FROM OLD.estimated_trip_price
     OR NEW.estimated_load_price IS DISTINCT FROM OLD.estimated_load_price
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.origin_notes IS DISTINCT FROM OLD.origin_notes
     OR NEW.destination_notes IS DISTINCT FROM OLD.destination_notes
     OR NEW.requested_date IS DISTINCT FROM OLD.requested_date
     OR NEW.metadata IS DISTINCT FROM OLD.metadata
  THEN
    RAISE EXCEPTION 'transport request identity, notes, and pricing cannot be changed';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = OLD.customer_id
        AND p.clerk_user_id = actor_clerk
    ) INTO is_customer;

    SELECT EXISTS (
      SELECT 1
      FROM public.provider_profiles pp
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE pp.id = OLD.provider_id
        AND p.clerk_user_id = actor_clerk
    ) INTO is_transporter;

    IF OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
      IF NOT is_customer THEN
        RAISE EXCEPTION 'only the requester can cancel a pending transport request';
      END IF;
    ELSIF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
      IF NOT is_transporter THEN
        RAISE EXCEPTION 'only the assigned transporter can accept or reject';
      END IF;
    ELSIF OLD.status = 'accepted' AND NEW.status IN ('completed', 'cancelled') THEN
      IF NOT is_transporter THEN
        RAISE EXCEPTION 'only the assigned transporter can complete or cancel a confirmed booking';
      END IF;
    ELSE
      RAISE EXCEPTION 'invalid transport request status transition: % → %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Providers update assigned transport requests" ON public.transport_requests;
CREATE POLICY "Providers update assigned transport requests" ON public.transport_requests
  FOR UPDATE
  USING (
    status IN ('pending', 'accepted')
    AND provider_id IN (
      SELECT pp.id FROM public.provider_profiles pp
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT pp.id FROM public.provider_profiles pp
      JOIN public.profiles p ON p.id = pp.profile_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub'
    )
    AND status IN ('accepted', 'rejected', 'completed', 'cancelled')
  );

DROP POLICY IF EXISTS "Customers cancel own transport requests" ON public.transport_requests;
CREATE POLICY "Customers cancel own transport requests" ON public.transport_requests
  FOR UPDATE
  USING (
    status = 'pending'
    AND customer_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
  WITH CHECK (
    status = 'cancelled'
    AND customer_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_transport_requests_one_pending_per_service
  ON public.transport_requests (customer_id, transport_service_id)
  WHERE status = 'pending' AND transport_service_id IS NOT NULL;
