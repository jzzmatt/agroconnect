import type { UserRoleType, ThemePreference, AccountType, UserStatus } from "./database";

export interface UserProfileWithRoles {
  id: string;
  clerk_user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_slug: string | null;
  preferred_language: string;
  account_type: AccountType;
  status: UserStatus;
  theme_preference: ThemePreference;
  is_active: boolean;
  roles: UserRoleType[];
  created_at: string;
  updated_at: string;
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

