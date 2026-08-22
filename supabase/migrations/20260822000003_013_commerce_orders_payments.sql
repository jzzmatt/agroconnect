-- ==============================================================================
-- AGROCONNECT — Phase 8: Migration 013 - Commerce, Cart, Orders & Payments Foundation
-- 1. Order Number Sequence Generator (concurrency-safe: AGC-YYYY-000001)
-- 2. Customer Delivery Addresses Table
-- 3. Carts & Cart Items Tables
-- 4. Orders, Order Items & Order Seller Groups Tables
-- 5. Payments, Payment Attempts & Webhook Event Logs Tables
-- 6. Inventory Deduction & Atomic Order Checkout RPC
-- ==============================================================================

-- 1. Sequence for human-readable order numbers
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_seq BIGINT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_seq := nextval('public.order_number_seq');
  RETURN 'AGC-' || v_year || '-' || lpad(v_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 2. Customer Delivery Addresses Table
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Minha Fazenda / Entrega',
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
  municipality_id UUID REFERENCES public.municipalities(id) ON DELETE SET NULL,
  address_line TEXT NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location GEOGRAPHY(Point, 4326),
  notes TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_profile ON public.customer_addresses(profile_id);

DROP TRIGGER IF EXISTS tr_customer_addresses_updated_at ON public.customer_addresses;
CREATE TRIGGER tr_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_customer_addresses_spatial_sync ON public.customer_addresses;
CREATE TRIGGER tr_customer_addresses_spatial_sync BEFORE INSERT OR UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.sync_geography_point();

-- 3. Carts & Cart Items
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'AOA',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_active_customer_cart UNIQUE (customer_id, status)
);

CREATE INDEX IF NOT EXISTS idx_carts_customer ON public.carts(customer_id);

DROP TRIGGER IF EXISTS tr_carts_updated_at ON public.carts;
CREATE TRIGGER tr_carts_updated_at BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'AOA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_cart_product UNIQUE (cart_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_seller ON public.cart_items(seller_id);

DROP TRIGGER IF EXISTS tr_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER tr_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  order_number TEXT UNIQUE NOT NULL DEFAULT public.generate_order_number(),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (
    status IN ('pending_payment', 'paid', 'processing', 'ready_for_fulfillment', 'shipped', 'ready_for_pickup', 'completed', 'cancelled', 'failed', 'refunded')
  ),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded')
  ),
  fulfillment_method TEXT NOT NULL DEFAULT 'delivery' CHECK (
    fulfillment_method IN ('delivery', 'pickup')
  ),
  currency TEXT NOT NULL DEFAULT 'AOA',
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
  tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax >= 0),
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
  shipping_address_id UUID REFERENCES public.customer_addresses(id) ON DELETE SET NULL,
  shipping_address_snapshot JSONB,
  notes TEXT,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

DROP TRIGGER IF EXISTS tr_orders_updated_at ON public.orders;
CREATE TRIGGER tr_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4.1 Order Seller Groups Table (Multi-seller parent-child fulfillment)
CREATE TABLE IF NOT EXISTS public.order_seller_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (
    status IN ('pending', 'processing', 'ready_for_pickup', 'shipped', 'completed', 'cancelled')
  ),
  fulfillment_method TEXT NOT NULL DEFAULT 'delivery' CHECK (
    fulfillment_method IN ('delivery', 'pickup')
  ),
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  seller_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_order_seller UNIQUE (order_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_order_seller_groups_order ON public.order_seller_groups(order_id);
CREATE INDEX IF NOT EXISTS idx_order_seller_groups_seller ON public.order_seller_groups(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_seller_groups_status ON public.order_seller_groups(status);

DROP TRIGGER IF EXISTS tr_order_seller_groups_updated_at ON public.order_seller_groups;
CREATE TRIGGER tr_order_seller_groups_updated_at BEFORE UPDATE ON public.order_seller_groups FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4.2 Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_group_id UUID REFERENCES public.order_seller_groups(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE RESTRICT,
  product_title TEXT NOT NULL,
  product_slug TEXT,
  sku TEXT,
  unit TEXT NOT NULL DEFAULT 'unidade',
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  currency TEXT NOT NULL DEFAULT 'AOA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller ON public.order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);

-- 5. Payments & Payment Webhook Events
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL DEFAULT 'sandbox_mock', -- e.g. 'sandbox_mock', 'multicaixa_gpo', 'unitel_money', 'stripe'
  provider_payment_id TEXT,
  payment_method TEXT NOT NULL DEFAULT 'mock_sandbox' CHECK (
    payment_method IN ('card', 'bank_transfer', 'mobile_money', 'cash_on_delivery', 'mock_sandbox')
  ),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'AOA',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded')
  ),
  idempotency_key TEXT UNIQUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_ref ON public.payments(provider, provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

DROP TRIGGER IF EXISTS tr_payments_updated_at ON public.payments;
CREATE TRIGGER tr_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  provider_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_events_provider_event ON public.payment_events(provider, provider_event_id);

-- 6. Row Level Security Policies
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_seller_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Address Policies
CREATE POLICY "Customers manage own addresses" ON public.customer_addresses FOR ALL 
  USING (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

-- Cart Policies
CREATE POLICY "Customers manage own carts" ON public.carts FOR ALL 
  USING (customer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()))
  WITH CHECK (customer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

CREATE POLICY "Customers manage own cart items" ON public.cart_items FOR ALL 
  USING (cart_id IN (SELECT id FROM public.carts WHERE customer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())))
  WITH CHECK (cart_id IN (SELECT id FROM public.carts WHERE customer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())));

-- Order Policies
CREATE POLICY "Customers read own orders" ON public.orders FOR SELECT 
  USING (customer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

CREATE POLICY "Customers insert own orders" ON public.orders FOR INSERT 
  WITH CHECK (customer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

CREATE POLICY "Sellers read own order groups" ON public.order_seller_groups FOR SELECT 
  USING (seller_id IN (SELECT id FROM public.provider_profiles WHERE profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())));

CREATE POLICY "Sellers update own order groups" ON public.order_seller_groups FOR UPDATE 
  USING (seller_id IN (SELECT id FROM public.provider_profiles WHERE profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())));

CREATE POLICY "Customers read own order items" ON public.order_items FOR SELECT 
  USING (order_id IN (SELECT id FROM public.orders WHERE customer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())));

CREATE POLICY "Sellers read own order items" ON public.order_items FOR SELECT 
  USING (seller_id IN (SELECT id FROM public.provider_profiles WHERE profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())));

CREATE POLICY "Customers read own payments" ON public.payments FOR SELECT 
  USING (order_id IN (SELECT id FROM public.orders WHERE customer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())));
