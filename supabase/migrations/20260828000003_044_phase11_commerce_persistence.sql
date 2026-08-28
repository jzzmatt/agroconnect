-- ==============================================================================
-- AGROCONNECT — Phase 11: Commerce persistence
-- 1. Allow more than one converted cart per customer
-- 2. Let sellers read the parent orders they fulfill
-- 3. Let customers cancel their own orders
-- 4. Let checkout persist child rows for the customer's order
-- ==============================================================================

-- Active carts must be unique per customer. Converted/abandoned carts accumulate.
ALTER TABLE public.carts DROP CONSTRAINT IF EXISTS uq_active_customer_cart;

DROP INDEX IF EXISTS uq_active_customer_cart;
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_customer_cart
  ON public.carts (customer_id)
  WHERE status = 'active';

-- Sellers need the parent order (number, totals, customer snapshot) to fulfill.
DROP POLICY IF EXISTS "Sellers read orders for their groups" ON public.orders;
CREATE POLICY "Sellers read orders for their groups"
  ON public.orders
  FOR SELECT
  USING (
    id IN (
      SELECT osg.order_id
      FROM public.order_seller_groups osg
      WHERE osg.seller_id IN (
        SELECT pp.id
        FROM public.provider_profiles pp
        WHERE pp.profile_id IN (
          SELECT p.id FROM public.profiles p WHERE p.clerk_user_id = public.current_clerk_user_id()
        )
      )
    )
  );

-- Customers may cancel or update notes on their own orders.
DROP POLICY IF EXISTS "Customers update own orders" ON public.orders;
CREATE POLICY "Customers update own orders"
  ON public.orders
  FOR UPDATE
  USING (
    customer_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()
    )
  )
  WITH CHECK (
    customer_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()
    )
  );

-- Checkout inserts child rows for an order the customer just created.
DROP POLICY IF EXISTS "Customers insert own order groups" ON public.order_seller_groups;
CREATE POLICY "Customers insert own order groups"
  ON public.order_seller_groups
  FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders
      WHERE customer_id IN (
        SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()
      )
    )
  );

DROP POLICY IF EXISTS "Customers insert own order items" ON public.order_items;
CREATE POLICY "Customers insert own order items"
  ON public.order_items
  FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders
      WHERE customer_id IN (
        SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()
      )
    )
  );

DROP POLICY IF EXISTS "Customers insert own payments" ON public.payments;
CREATE POLICY "Customers insert own payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders
      WHERE customer_id IN (
        SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()
      )
    )
  );
