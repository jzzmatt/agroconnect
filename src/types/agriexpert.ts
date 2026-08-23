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
