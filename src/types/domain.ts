import type {
  UserRoleType,
  ThemePreference,
  AccountType,
  UserStatus,
  ProfessionalTitle,
  ProfileType,
  SubscriptionPlan,
} from "./database";

export interface UserProfileWithRoles {
  id: string;
  clerk_user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_phone?: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_slug: string | null;
  professional_title?: ProfessionalTitle;
  professional_title_custom?: string | null;
  active_profile_type?: ProfileType;
  subscription_plan?: SubscriptionPlan;
  preferred_language: string;
  account_type: AccountType;
  status: UserStatus;
  theme_preference: ThemePreference;
  is_active: boolean;
  roles: UserRoleType[];
  created_at: string;
  updated_at: string;
}

export interface UserEntitlements {
  can_sell_products: boolean;
  can_create_products: boolean;
  can_edit_products: boolean;
  can_publish_products: boolean;
  can_manage_inventory: boolean;
  can_manage_services: boolean;
  can_teach_courses: boolean;
  can_create_courses: boolean;
  can_publish_courses: boolean;
  can_access_business_dashboard: boolean;
  product_limit: number | null; // null represents unlimited
  max_products: number | null;
  max_services: number | null;
}

export interface SubscriptionPlanDefinition {
  id: SubscriptionPlan;
  slug: "basic" | "professional" | "business" | "enterprise";
  name: string;
  priceMonthlyAoa: number;
  priceFormatted: string;
  period: string;
  tagline: string;
  highlightBadge?: string;
  isPopular?: boolean;
  productLimit: number | null;
  features: string[];
  lockedFeatures?: string[];
  ctaText: string;
}

export interface UserGreetingResult {
  greeting: string;
  fullNameOrTitle: string;
  displayName: string;
  activeProfileLabel: string;
  activeProfileIcon: string;
}

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface GeographicLocation {
  id?: string;
  countryCode: string;
  countryName: string;
  provinceCode?: string | null;
  provinceName: string;
  municipalityCode?: string | null;
  municipalityName?: string | null;
  communeCode?: string | null;
  communeName?: string | null;
  coordinates?: GeoCoordinate | null;
}

export interface PillarCapability {
  id: "agriexpert" | "agriacademy" | "agrishopping" | "agrilocalizacao";
  name: string;
  slug: string;
  tagline: string;
  allowedRoles: UserRoleType[];
}

export interface ServiceListItem {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_slug: string;
  provider_avatar_url?: string | null;
  provider_rating?: number | null;
  provider_reviews_count?: number | null;
  provider_verified: boolean;
  category_id?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  title: string;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  pricing_type: string;
  price: number;
  currency: string;
  location_type?: string;
  province_id?: string | null;
  province_name?: string | null;
  municipality_id?: string | null;
  municipality_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  service_radius_km?: number | null;
  distance_km?: number | null;
  is_within_service_area?: boolean;
  status: string;
  is_featured: boolean;
  image_url?: string | null;
  created_at: string;
}

export interface ProviderPublicProfile {
  id: string;
  profile_id: string;
  business_name: string;
  slug: string;
  headline?: string | null;
  description?: string | null;
  provider_type: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  verification_status: string;
  status: string;
  rating: number;
  reviews_count: number;
  province_name?: string | null;
  municipality_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  service_radius_km: number;
  services_count?: number;
  created_at: string;
}

export interface ServiceRequestItem {
  id: string;
  customer_id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  provider_id: string;
  provider_name?: string | null;
  service_id?: string | null;
  service_title?: string | null;
  service_slug?: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "completed";
  requested_date?: string | null;
  message?: string | null;
  location_notes?: string | null;
  estimated_price?: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface ProductListItem {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_slug: string;
  seller_avatar_url?: string | null;
  seller_rating?: number | null;
  seller_verified: boolean;
  category_id?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  condition: string;
  price: number;
  currency: string;
  quantity: number;
  unit: string;
  sku?: string | null;
  availability_status: string;
  location_type?: string;
  province_id?: string | null;
  province_name?: string | null;
  municipality_id?: string | null;
  municipality_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  selling_radius_km?: number | null;
  distance_km?: number | null;
  is_within_selling_area?: boolean;
  status: string;
  is_featured: boolean;
  image_url?: string | null;
  created_at: string;
}

export interface SellerPublicProfile {
  id: string;
  profile_id: string;
  business_name: string;
  slug: string;
  headline?: string | null;
  description?: string | null;
  provider_type: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  verification_status: string;
  status: string;
  rating: number;
  reviews_count: number;
  province_name?: string | null;
  municipality_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  selling_radius_km: number;
  products_count?: number;
  created_at: string;
}

export interface ProductRequestItem {
  id: string;
  customer_id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  seller_id: string;
  seller_name?: string | null;
  product_id?: string | null;
  product_title?: string | null;
  product_slug?: string | null;
  quantity: number;
  unit: string;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "completed";
  message?: string | null;
  delivery_location_notes?: string | null;
  offered_price?: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  profile_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  province_id?: string | null;
  province_name?: string | null;
  municipality_id?: string | null;
  municipality_name?: string | null;
  address_line: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  is_default: boolean;
  created_at: string;
}

export interface CartItemDescriptor {
  id: string;
  product_id: string;
  seller_id: string;
  seller_name: string;
  seller_slug?: string;
  title: string;
  slug: string;
  unit_price: number;
  quantity: number;
  unit: string;
  subtotal: number;
  currency: string;
  image_url?: string | null;
  max_available_quantity?: number;
  is_available: boolean;
}

export interface ShoppingCart {
  id: string;
  customer_id?: string | null;
  currency: string;
  items: CartItemDescriptor[];
  items_count: number;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  sellers_count: number;
}

export interface OrderItemDescriptor {
  id: string;
  order_id: string;
  product_id: string | null;
  seller_id: string;
  product_title: string;
  product_slug?: string | null;
  sku?: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  currency: string;
}

export interface OrderSellerGroupDescriptor {
  id: string;
  order_id: string;
  seller_id: string;
  seller_name: string;
  seller_slug?: string;
  status: "pending" | "processing" | "ready_for_pickup" | "shipped" | "completed" | "cancelled";
  fulfillment_method: "delivery" | "pickup";
  subtotal: number;
  delivery_fee: number;
  total: number;
  items: OrderItemDescriptor[];
}

export interface OrderDescriptor {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  status:
    | "pending_payment"
    | "paid"
    | "processing"
    | "ready_for_fulfillment"
    | "shipped"
    | "ready_for_pickup"
    | "completed"
    | "cancelled"
    | "failed"
    | "refunded";
  payment_status:
    | "pending"
    | "processing"
    | "paid"
    | "failed"
    | "cancelled"
    | "refunded"
    | "partially_refunded";
  fulfillment_method: "delivery" | "pickup";
  currency: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  tax: number;
  total: number;
  shipping_address?: CustomerAddress | null;
  notes?: string | null;
  cancelled_reason?: string | null;
  items: OrderItemDescriptor[];
  seller_groups: OrderSellerGroupDescriptor[];
  payment?: PaymentRecordDescriptor | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecordDescriptor {
  id: string;
  order_id: string;
  provider: string;
  provider_payment_id?: string | null;
  payment_method: "card" | "bank_transfer" | "mobile_money" | "cash_on_delivery" | "mock_sandbox";
  amount: number;
  currency: string;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded" | "partially_refunded";
  paid_at?: string | null;
  created_at: string;
}

