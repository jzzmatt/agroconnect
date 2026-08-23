export type DomainMediaEntityType = "product" | "course" | "profile" | "provider" | "service" | "general";
export type MediaProvider = "imagekit" | "bunny_stream" | "supabase" | "local";

export interface MediaAssetDescriptor {
  id: string;
  owner_id: string;
  entity_type: DomainMediaEntityType;
  entity_id?: string | null;
  provider: MediaProvider;
  external_id?: string | null;
  storage_path?: string | null;
  url: string;
  thumbnail_url?: string | null;
  mime_type: string;
  file_size: number;
  duration_seconds?: number | null;
  width?: number | null;
  height?: number | null;
  status: "pending" | "uploading" | "ready" | "failed" | "deleted";
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImageDescriptor {
  id: string;
  product_id: string;
  owner_id: string;
  url: string;
  alt_text: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
  file_size: number;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}
