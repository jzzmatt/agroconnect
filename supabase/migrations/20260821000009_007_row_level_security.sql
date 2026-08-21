-- ==============================================================================
-- AGROCONNECT — Phase 3: Migration 007 - Row Level Security (RLS) & Security Policies
-- Designed for Clerk native JWT session claims via `auth.jwt() ->> 'sub'`
-- ==============================================================================

-- 1. Helper function to get current Clerk User ID from JWT claim safely
CREATE OR REPLACE FUNCTION public.current_clerk_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Enable RLS on all exposed tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.localities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Geography Policies (Public Read, Admin Write)
-- ------------------------------------------------------------------------------
CREATE POLICY "Public read active countries" ON public.countries FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active provinces" ON public.provinces FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active municipalities" ON public.municipalities FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active communes" ON public.communes FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active localities" ON public.localities FOR SELECT USING (is_active = true);

-- ------------------------------------------------------------------------------
-- Profile & Roles Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Public read active profiles" ON public.profiles FOR SELECT USING (status = 'active');
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (clerk_user_id = public.current_clerk_user_id());
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (clerk_user_id = public.current_clerk_user_id());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE 
  USING (clerk_user_id = public.current_clerk_user_id())
  WITH CHECK (clerk_user_id = public.current_clerk_user_id());

CREATE POLICY "Public read user roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Users insert own roles" ON public.user_roles FOR INSERT WITH CHECK (clerk_user_id = public.current_clerk_user_id());
CREATE POLICY "Users delete own roles" ON public.user_roles FOR DELETE USING (clerk_user_id = public.current_clerk_user_id());

-- ------------------------------------------------------------------------------
-- Profile Locations Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Public read primary profile locations" ON public.profile_locations FOR SELECT USING (is_primary = true);
CREATE POLICY "Users read own profile locations" ON public.profile_locations FOR SELECT 
  USING (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));
CREATE POLICY "Users insert own profile locations" ON public.profile_locations FOR INSERT 
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));
CREATE POLICY "Users update own profile locations" ON public.profile_locations FOR UPDATE 
  USING (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));
CREATE POLICY "Users delete own profile locations" ON public.profile_locations FOR DELETE 
  USING (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

-- ------------------------------------------------------------------------------
-- Categories Policies (Public Read)
-- ------------------------------------------------------------------------------
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT USING (is_active = true);

-- ------------------------------------------------------------------------------
-- Provider Profiles Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Public read active providers" ON public.provider_profiles FOR SELECT USING (status = 'active');
CREATE POLICY "Providers manage own profile" ON public.provider_profiles FOR ALL 
  USING (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

-- ------------------------------------------------------------------------------
-- Services & Products & Agricultural Resources Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Public read active services" ON public.services FOR SELECT USING (status = 'active');
CREATE POLICY "Providers manage own services" ON public.services FOR ALL 
  USING (provider_id IN (SELECT id FROM public.provider_profiles WHERE profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())))
  WITH CHECK (provider_id IN (SELECT id FROM public.provider_profiles WHERE profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())));

CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (status = 'active');
CREATE POLICY "Sellers manage own products" ON public.products FOR ALL 
  USING (seller_id IN (SELECT id FROM public.provider_profiles WHERE profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())))
  WITH CHECK (seller_id IN (SELECT id FROM public.provider_profiles WHERE profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())));

CREATE POLICY "Public read active agricultural resources" ON public.agricultural_resources FOR SELECT USING (status = 'active');
CREATE POLICY "Providers manage own resources" ON public.agricultural_resources FOR ALL 
  USING (provider_id IN (SELECT id FROM public.provider_profiles WHERE profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())))
  WITH CHECK (provider_id IN (SELECT id FROM public.provider_profiles WHERE profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())));

-- ------------------------------------------------------------------------------
-- Reviews Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Public read published reviews" ON public.reviews FOR SELECT USING (status = 'published');
CREATE POLICY "Users insert own reviews" ON public.reviews FOR INSERT 
  WITH CHECK (reviewer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));
CREATE POLICY "Users update own reviews" ON public.reviews FOR UPDATE 
  USING (reviewer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()))
  WITH CHECK (reviewer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

-- ------------------------------------------------------------------------------
-- Service Requests / Bookings Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Customers read own requests" ON public.service_requests FOR SELECT 
  USING (customer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));
CREATE POLICY "Providers read received requests" ON public.service_requests FOR SELECT 
  USING (provider_id IN (SELECT id FROM public.provider_profiles WHERE profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())));
CREATE POLICY "Customers create service requests" ON public.service_requests FOR INSERT 
  WITH CHECK (customer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));
CREATE POLICY "Participants update service requests" ON public.service_requests FOR UPDATE 
  USING (
    customer_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()) OR
    provider_id IN (SELECT id FROM public.provider_profiles WHERE profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()))
  );

-- ------------------------------------------------------------------------------
-- Notifications Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL 
  USING (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

-- ------------------------------------------------------------------------------
-- Favorites Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL 
  USING (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()))
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

-- ------------------------------------------------------------------------------
-- Media Assets Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Public read media assets" ON public.media_assets FOR SELECT USING (true);
CREATE POLICY "Users manage own media assets" ON public.media_assets FOR ALL 
  USING (owner_profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()))
  WITH CHECK (owner_profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

-- ------------------------------------------------------------------------------
-- Audit Logs Policies (Write-only by system, Read by admin/owner)
-- ------------------------------------------------------------------------------
CREATE POLICY "Users read own audit logs" ON public.audit_logs FOR SELECT 
  USING (actor_profile_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));
CREATE POLICY "System insert audit logs" ON public.audit_logs FOR INSERT 
  WITH CHECK (true);
