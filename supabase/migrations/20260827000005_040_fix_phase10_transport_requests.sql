-- Fix-Phase-10: Transport request persistence, recipient binding, and RLS

ALTER TABLE public.transport_requests
  DROP CONSTRAINT IF EXISTS transport_requests_status_check;

ALTER TABLE public.transport_requests
  ADD CONSTRAINT transport_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed'));

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

DROP TRIGGER IF EXISTS tr_transport_requests_protect_identity ON public.transport_requests;
CREATE TRIGGER tr_transport_requests_protect_identity
  BEFORE UPDATE ON public.transport_requests
  FOR EACH ROW EXECUTE FUNCTION public.protect_transport_request_identity();

DROP POLICY IF EXISTS "Customers create transport requests" ON public.transport_requests;
CREATE POLICY "Customers create transport requests" ON public.transport_requests
  FOR INSERT WITH CHECK (
    status = 'pending'
    AND transport_service_id IS NOT NULL
    AND customer_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
    AND EXISTS (
      SELECT 1
      FROM public.transport_services ts
      WHERE ts.id = transport_service_id
        AND ts.status = 'published'
        AND ts.provider_id = provider_id
    )
  );

DROP POLICY IF EXISTS "Participants update transport requests" ON public.transport_requests;

DROP POLICY IF EXISTS "Providers update assigned transport requests" ON public.transport_requests;
CREATE POLICY "Providers update assigned transport requests" ON public.transport_requests
  FOR UPDATE
  USING (
    provider_id IN (
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
    AND status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')
  );

DROP POLICY IF EXISTS "Customers cancel own transport requests" ON public.transport_requests;
CREATE POLICY "Customers cancel own transport requests" ON public.transport_requests
  FOR UPDATE
  USING (
    customer_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
    AND status = 'cancelled'
  );
