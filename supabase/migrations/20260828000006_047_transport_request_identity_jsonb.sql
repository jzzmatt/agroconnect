-- Harden transport_requests identity freeze so UPDATE (Accept/Reject/Complete)
-- still works when order-link columns from 045 are not present on the live table.
-- Freeze only keys that actually exist on OLD/NEW (to_jsonb), instead of
-- reading NEW.order_id / seller_group_id / request_source directly.

CREATE OR REPLACE FUNCTION public.protect_transport_request_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  old_row jsonb := to_jsonb(OLD);
  new_row jsonb := to_jsonb(NEW);
  frozen_keys text[] := ARRAY[
    'customer_id',
    'provider_id',
    'transport_service_id',
    'estimated_trip_price',
    'estimated_load_price',
    'currency',
    'order_id',
    'seller_group_id',
    'request_source'
  ];
  key text;
BEGIN
  FOREACH key IN ARRAY frozen_keys LOOP
    IF (new_row ? key) AND ((new_row -> key) IS DISTINCT FROM (old_row -> key)) THEN
      RAISE EXCEPTION 'transport request identity and pricing cannot be changed';
    END IF;
  END LOOP;

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
