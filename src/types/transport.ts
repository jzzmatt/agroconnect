export type TransportPublicationStatus = "draft" | "published" | "paused" | "archived";

export type TransportRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";

export interface TransportListItem {
  id: string;
  provider_id: string;
  provider_name: string;
  provider_slug: string;
  provider_verified: boolean;
  title: string;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  origin_label?: string | null;
  destination_label?: string | null;
  origin_province_name?: string | null;
  origin_municipality_name?: string | null;
  destination_province_name?: string | null;
  destination_municipality_name?: string | null;
  vehicle_name: string;
  vehicle_type?: string | null;
  vehicle_model?: string | null;
  capacity_load?: string | null;
  vehicle_media_url?: string | null;
  base_province_name?: string | null;
  base_municipality_name?: string | null;
  base_latitude?: number | null;
  base_longitude?: number | null;
  price_per_trip: number;
  price_per_load: number;
  currency: string;
  status: TransportPublicationStatus;
  created_at: string;
}

export interface TransportRequestItem {
  id: string;
  customer_id: string;
  customer_name?: string | null;
  provider_id: string;
  provider_name?: string | null;
  transport_service_id?: string | null;
  transport_title?: string | null;
  transport_slug?: string | null;
  status: TransportRequestStatus;
  message?: string | null;
  origin_notes?: string | null;
  destination_notes?: string | null;
  requested_date?: string | null;
  estimated_trip_price?: number | null;
  estimated_load_price?: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface PublishedExpertListItem {
  id: string;
  slug: string;
  name: string;
  title: string;
  specialty: string;
  provinceName: string;
  municipalityName?: string;
  rating: number;
  consultationsCount: number;
  avatarUrl?: string | null;
  verified: boolean;
  hourlyRate?: string;
}
