import { createPublicServerSupabaseClient } from "@/lib/supabase/client";

export interface VendorLocation {
  id: string;
  business_name: string;
  slug: string;
  verification_status: string | null;
  province_name: string | null;
  municipality_name: string | null;
  latitude: number;
  longitude: number;
  service_radius_km: number | null;
}

/** Zoom that keeps a single vendor pin prominent without over-zooming. */
export const VENDOR_MAP_ZOOM = 13;

/**
 * Minimal vendor record for the AgriLocalização deep link.
 *
 * Selects only the columns the map needs — no description, metadata, or
 * catalogue — so opening a vendor pin never pulls a full profile payload.
 */
export async function getVendorLocation(vendorId: string): Promise<VendorLocation | null> {
  if (!vendorId) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!url || url.includes("placeholder")) return null;

  try {
    const supabase = createPublicServerSupabaseClient();
    const { data, error } = await (supabase.from("provider_profiles") as any)
      .select(
        "id,business_name,slug,verification_status,latitude,longitude,service_radius_km,provinces(name),municipalities(name)"
      )
      .eq("id", vendorId)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data) return null;
    if (data.latitude === null || data.longitude === null) return null;

    return {
      id: data.id,
      business_name: data.business_name,
      slug: data.slug,
      verification_status: data.verification_status ?? null,
      province_name: data.provinces?.name ?? null,
      municipality_name: data.municipalities?.name ?? null,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      service_radius_km: data.service_radius_km ? Number(data.service_radius_km) : null,
    };
  } catch {
    return null;
  }
}
