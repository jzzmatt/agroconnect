-- ==============================================================================
-- AGROCONNECT — Phase 9: Migration 018
-- Delivery, Logistics, Courier Assignment, Order Tracking, Delivery Zones & Notifications
-- ==============================================================================

-- 1. Delivery Zones Table (PostGIS Spatial Boundaries & Base Delivery Pricing)
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
  municipality_id UUID REFERENCES public.municipalities(id) ON DELETE SET NULL,
  boundary GEOMETRY(Polygon, 4326),
  base_fee NUMERIC(12, 2) NOT NULL DEFAULT 2500.00 CHECK (base_fee >= 0),
  per_km_fee NUMERIC(12, 2) NOT NULL DEFAULT 150.00 CHECK (per_km_fee >= 0),
  estimated_hours INTEGER DEFAULT 24,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_delivery_zones_province ON public.delivery_zones(province_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_boundary ON public.delivery_zones USING GIST (boundary);

DROP TRIGGER IF EXISTS tr_delivery_zones_updated_at ON public.delivery_zones;
CREATE TRIGGER tr_delivery_zones_updated_at BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Couriers / Logistics Operators Table
CREATE TABLE IF NOT EXISTS public.couriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  company_name TEXT,
  vehicle_type TEXT NOT NULL DEFAULT 'motorcycle' CHECK (
    vehicle_type IN ('motorcycle', 'pickup_truck', 'van', 'heavy_truck', 'bicycle')
  ),
  license_plate TEXT,
  phone TEXT NOT NULL,
  whatsapp_phone TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (
    status IN ('available', 'busy', 'offline', 'suspended')
  ),
  verification_status TEXT NOT NULL DEFAULT 'verified' CHECK (
    verification_status IN ('unverified', 'pending', 'verified', 'rejected')
  ),
  rating NUMERIC(3, 2) DEFAULT 5.00,
  deliveries_count INTEGER DEFAULT 0,
  operating_province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_courier_profile UNIQUE (profile_id)
);

CREATE INDEX IF NOT EXISTS idx_couriers_profile ON public.couriers(profile_id);
CREATE INDEX IF NOT EXISTS idx_couriers_status ON public.couriers(status);

DROP TRIGGER IF EXISTS tr_couriers_updated_at ON public.couriers;
CREATE TRIGGER tr_couriers_updated_at BEFORE UPDATE ON public.couriers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Enhance Order Seller Groups with Delivery Status, Courier Assignment & Delivery OTP
ALTER TABLE public.order_seller_groups ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'not_assigned' CHECK (
  delivery_status IN (
    'not_assigned',
    'assigned',
    'accepted',
    'picked_up',
    'in_transit',
    'delivered',
    'failed',
    'cancelled'
  )
);

ALTER TABLE public.order_seller_groups ADD COLUMN IF NOT EXISTS courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL;
ALTER TABLE public.order_seller_groups ADD COLUMN IF NOT EXISTS delivery_otp_hash TEXT;
ALTER TABLE public.order_seller_groups ADD COLUMN IF NOT EXISTS delivery_otp_plain TEXT; -- Only exposed to authenticated customer
ALTER TABLE public.order_seller_groups ADD COLUMN IF NOT EXISTS proof_of_delivery_type TEXT CHECK (proof_of_delivery_type IN ('otp', 'photo', 'signature'));
ALTER TABLE public.order_seller_groups ADD COLUMN IF NOT EXISTS proof_of_delivery_url TEXT;
ALTER TABLE public.order_seller_groups ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE public.order_seller_groups ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE public.order_seller_groups ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.order_seller_groups ADD COLUMN IF NOT EXISTS failed_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_order_seller_groups_courier ON public.order_seller_groups(courier_id);
CREATE INDEX IF NOT EXISTS idx_order_seller_groups_delivery_status ON public.order_seller_groups(delivery_status);

-- 4. Order Tracking Events Table (Immutable Audit Event Log)
CREATE TABLE IF NOT EXISTS public.order_tracking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  seller_group_id UUID REFERENCES public.order_seller_groups(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  actor_name TEXT,
  actor_type TEXT NOT NULL DEFAULT 'system' CHECK (
    actor_type IN ('customer', 'seller', 'courier', 'logistics_admin', 'system')
  ),
  location_name TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_tracking_events_order ON public.order_tracking_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_events_seller_group ON public.order_tracking_events(seller_group_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_events_created ON public.order_tracking_events(created_at DESC);

-- 5. Helper Function: Verify Delivery OTP Concurrency-Safely
CREATE OR REPLACE FUNCTION public.verify_delivery_otp(
  p_seller_group_id UUID,
  p_courier_id UUID,
  p_otp_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_group RECORD;
BEGIN
  SELECT id, delivery_otp_plain, delivery_status, courier_id INTO v_group
  FROM public.order_seller_groups
  WHERE id = p_seller_group_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grupo de entrega não encontrado.';
  END IF;

  IF v_group.courier_id IS DISTINCT FROM p_courier_id THEN
    RAISE EXCEPTION 'Não autorizado: O transportador não corresponde ao atribuído.';
  END IF;

  IF v_group.delivery_status = 'delivered' THEN
    RETURN TRUE;
  END IF;

  IF v_group.delivery_otp_plain = trim(p_otp_code) THEN
    UPDATE public.order_seller_groups
    SET delivery_status = 'delivered',
        status = 'completed',
        delivered_at = timezone('utc'::text, now()),
        proof_of_delivery_type = 'otp',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_seller_group_id;

    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'Código OTP inválido. Verifique com o destinatário.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Insert Key Delivery Zones in Angola
INSERT INTO public.delivery_zones (name, description, base_fee, per_km_fee, estimated_hours)
VALUES
  ('Zona Huambo Central (Caála & Huambo)', 'Entrega rápida no Planalto Central', 2000.00, 100.00, 12),
  ('Zona Litoral Benguela (Lobito & Catumbela)', 'Entrega expressa litoral de Benguela', 2500.00, 120.00, 18),
  ('Zona Malanje Agrícola (Cacuso & Malanje)', 'Rotas rurais e entregas em fazendas', 3000.00, 150.00, 24),
  ('Zona Luanda Metropolitana & Cintura Verde', 'Distribuição na capital e cinturão hortícola', 3500.00, 200.00, 24)
ON CONFLICT DO NOTHING;
