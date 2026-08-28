import "server-only";

import { createPublicServerSupabaseClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/services/marketplace-service";
import { getTransportWritableClient } from "@/lib/transport/supabase-client";
import { extractOrderExpeditionLink } from "@/lib/transport/order-expedition";
import type {
  TransportListItem,
  TransportPublicationStatus,
  TransportRequestItem,
  TransportRequestStatus,
} from "@/types/transport";

export interface SearchTransportFilterParams {
  query?: string;
  originProvinceName?: string;
  destinationProvinceName?: string;
  limit?: number;
  offset?: number;
}

export interface CreateTransportInput {
  title: string;
  shortDescription?: string;
  description?: string;
  originLabel?: string;
  destinationLabel?: string;
  originProvinceId?: string;
  originMunicipalityId?: string;
  destinationProvinceId?: string;
  destinationMunicipalityId?: string;
  vehicleName: string;
  vehicleType?: string;
  vehicleModel?: string;
  capacityLoad?: string;
  vehicleMediaUrl?: string;
  vehicleVideoUrl?: string;
  baseProvinceId?: string;
  baseMunicipalityId?: string;
  baseLatitude?: number;
  baseLongitude?: number;
  pricePerTrip: number;
  pricePerLoad: number;
  currency?: string;
  status?: TransportPublicationStatus;
}

export interface UpdateTransportInput extends Partial<CreateTransportInput> {
  id: string;
}

export const INITIAL_TRANSPORT_SERVICES: TransportListItem[] = [
  {
    id: "trn-seed-1",
    provider_id: "prov-seed-1",
    provider_name: "Dr. João Silva • Veterinária & Pecuária",
    provider_slug: "dr-joao-silva",
    provider_verified: true,
    title: "Transporte de Gado Luanda → Benguela",
    slug: "transporte-gado-luanda-benguela",
    short_description: "Camião refrigerado para transporte de gado bovino e caprino entre Luanda e Benguela.",
    description:
      "Serviço especializado de transporte de animais vivos com camião refrigerado, seguro e acompanhamento veterinário opcional.",
    origin_label: "Luanda",
    destination_label: "Benguela",
    origin_province_name: "Luanda",
    destination_province_name: "Benguela",
    vehicle_name: "Kia Canter",
    vehicle_type: "Camião",
    vehicle_model: "Kia Canter 2020",
    capacity_load: "5 toneladas",
    vehicle_media_url: null,
    vehicle_video_url: null,
    base_province_name: "Luanda",
    base_municipality_name: "Viana",
    base_latitude: -8.9,
    base_longitude: 13.3,
    price_per_trip: 120000,
    price_per_load: 60000,
    currency: "AOA",
    status: "published",
    created_at: new Date().toISOString(),
  },
  {
    id: "trn-seed-2",
    provider_id: "prov-seed-2",
    provider_name: "Eng.ª Maria Santos • Solos & Irrigação",
    provider_slug: "maria-santos-agronoma",
    provider_verified: true,
    title: "Transporte de Insumos Huambo → Malanje",
    slug: "transporte-insumos-huambo-malanje",
    short_description: "Transporte de fertilizantes, sementes e equipamentos agrícolas no Planalto Central.",
    description: "Camião aberto com cobertura para transporte seguro de insumos agrícolas entre províncias do centro do país.",
    origin_label: "Huambo",
    destination_label: "Malanje",
    origin_province_name: "Huambo",
    destination_province_name: "Malanje",
    vehicle_name: "Toyota Dyna",
    vehicle_type: "Camião",
    vehicle_model: "Toyota Dyna 2019",
    capacity_load: "3 toneladas",
    vehicle_media_url: null,
    vehicle_video_url: null,
    base_province_name: "Huambo",
    base_municipality_name: "Caála",
    base_latitude: -12.85,
    base_longitude: 15.56,
    price_per_trip: 95000,
    price_per_load: 45000,
    currency: "AOA",
    status: "published",
    created_at: new Date().toISOString(),
  },
];

function asRelatedRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
}

function mapTransportRow(item: Record<string, unknown>): TransportListItem {
  const provider = item.provider_profiles as Record<string, unknown> | null;
  const originProvince = item.origin_provinces as { name?: string } | null;
  const originMunicipality = item.origin_municipalities as { name?: string } | null;
  const destinationProvince = item.destination_provinces as { name?: string } | null;
  const destinationMunicipality = item.destination_municipalities as { name?: string } | null;
  const baseProvince = item.base_provinces as { name?: string } | null;
  const baseMunicipality = item.base_municipalities as { name?: string } | null;

  return {
    id: String(item.id),
    provider_id: String(item.provider_id),
    provider_name: String(provider?.business_name || "Prestador"),
    provider_slug: String(provider?.slug || ""),
    provider_verified: provider?.verification_status === "verified",
    title: String(item.title),
    slug: String(item.slug),
    short_description: (item.short_description as string) || null,
    description: (item.description as string) || null,
    origin_label: (item.origin_label as string) || null,
    destination_label: (item.destination_label as string) || null,
    origin_province_name: originProvince?.name || null,
    origin_municipality_name: originMunicipality?.name || null,
    destination_province_name: destinationProvince?.name || null,
    destination_municipality_name: destinationMunicipality?.name || null,
    vehicle_name: String(item.vehicle_name),
    vehicle_type: (item.vehicle_type as string) || null,
    vehicle_model: (item.vehicle_model as string) || null,
    capacity_load: (item.capacity_load as string) || null,
    vehicle_media_url: (item.vehicle_media_url as string) || null,
    vehicle_video_url: (item.vehicle_video_url as string) || null,
    base_province_name: baseProvince?.name || null,
    base_municipality_name: baseMunicipality?.name || null,
    base_latitude: item.base_latitude != null ? Number(item.base_latitude) : null,
    base_longitude: item.base_longitude != null ? Number(item.base_longitude) : null,
    price_per_trip: Number(item.price_per_trip || 0),
    price_per_load: Number(item.price_per_load || 0),
    currency: String(item.currency || "AOA"),
    status: item.status as TransportPublicationStatus,
    created_at: String(item.created_at),
  };
}

const TRANSPORT_SELECT = `
  id,
  provider_id,
  title,
  slug,
  short_description,
  description,
  origin_label,
  destination_label,
  vehicle_name,
  vehicle_type,
  vehicle_model,
  capacity_load,
  vehicle_media_url,
  vehicle_video_url,
  base_latitude,
  base_longitude,
  price_per_trip,
  price_per_load,
  currency,
  status,
  created_at,
  provider_profiles(id, business_name, slug, verification_status),
  origin_provinces:provinces!transport_services_origin_province_id_fkey(name),
  origin_municipalities:municipalities!transport_services_origin_municipality_id_fkey(name),
  destination_provinces:provinces!transport_services_destination_province_id_fkey(name),
  destination_municipalities:municipalities!transport_services_destination_municipality_id_fkey(name),
  base_provinces:provinces!transport_services_base_province_id_fkey(name),
  base_municipalities:municipalities!transport_services_base_municipality_id_fkey(name)
`;

function filterSeedTransports(params: SearchTransportFilterParams = {}): TransportListItem[] {
  let filtered = INITIAL_TRANSPORT_SERVICES.filter((t) => t.status === "published");

  if (params.query) {
    const q = params.query.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.origin_label?.toLowerCase().includes(q) ||
        t.destination_label?.toLowerCase().includes(q) ||
        t.vehicle_name.toLowerCase().includes(q) ||
        t.provider_name.toLowerCase().includes(q)
    );
  }

  if (params.originProvinceName) {
    const origin = params.originProvinceName.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.origin_province_name?.toLowerCase() === origin ||
        t.origin_label?.toLowerCase().includes(origin)
    );
  }

  if (params.destinationProvinceName) {
    const dest = params.destinationProvinceName.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.destination_province_name?.toLowerCase() === dest ||
        t.destination_label?.toLowerCase().includes(dest)
    );
  }

  const offset = params.offset || 0;
  const limit = params.limit || 50;
  return filtered.slice(offset, offset + limit);
}

export class TransportService {
  public static async searchPublishedTransports(
    params: SearchTransportFilterParams = {}
  ): Promise<{ transports: TransportListItem[]; total: number }> {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      try {
        const supabase = createPublicServerSupabaseClient();
        let query = (supabase.from("transport_services") as any)
          .select(TRANSPORT_SELECT, { count: "exact" })
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (params.query) {
          query = query.or(
            `title.ilike.%${params.query}%,origin_label.ilike.%${params.query}%,destination_label.ilike.%${params.query}%,vehicle_name.ilike.%${params.query}%`
          );
        }

        const limit = params.limit || 50;
        const offset = params.offset || 0;
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (!error && data && data.length > 0) {
          let mapped: TransportListItem[] = data.map((row: Record<string, unknown>) => mapTransportRow(row));

          if (params.originProvinceName) {
            const origin = params.originProvinceName.toLowerCase();
            mapped = mapped.filter(
              (t) =>
                t.origin_province_name?.toLowerCase() === origin ||
                t.origin_label?.toLowerCase().includes(origin)
            );
          }

          if (params.destinationProvinceName) {
            const dest = params.destinationProvinceName.toLowerCase();
            mapped = mapped.filter(
              (t) =>
                t.destination_province_name?.toLowerCase() === dest ||
                t.destination_label?.toLowerCase().includes(dest)
            );
          }

          return { transports: mapped, total: count || mapped.length };
        }
      } catch (err) {
        console.warn("[TransportService.searchPublishedTransports] Fallback to seed:", err);
      }
    }

    const transports = filterSeedTransports(params);
    return { transports, total: transports.length };
  }

  public static async getTransportBySlug(slug: string): Promise<TransportListItem | null> {
    const seedMatch = INITIAL_TRANSPORT_SERVICES.find((t) => t.slug === slug && t.status === "published");

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      try {
        const supabase = createPublicServerSupabaseClient();
        const { data, error } = await (supabase.from("transport_services") as any)
          .select(TRANSPORT_SELECT)
          .eq("slug", slug)
          .eq("status", "published")
          .maybeSingle();

        if (!error && data) {
          return mapTransportRow(data as Record<string, unknown>);
        }
      } catch (err) {
        console.warn("[TransportService.getTransportBySlug] Fallback to seed:", err);
      }
    }

    return seedMatch || null;
  }

  public static async getProviderTransports(
    providerId: string,
    onlyPublished = true
  ): Promise<TransportListItem[]> {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      try {
        const supabase = onlyPublished
          ? createPublicServerSupabaseClient()
          : await getTransportWritableClient();
        let query = (supabase.from("transport_services") as any)
          .select(TRANSPORT_SELECT)
          .eq("provider_id", providerId);

        if (onlyPublished) {
          query = query.eq("status", "published");
        }

        const { data, error } = await query;
        if (!error && data) {
          return data.map((row: Record<string, unknown>) => mapTransportRow(row));
        }
      } catch (err) {
        console.warn("[TransportService.getProviderTransports] Fallback to seed:", err);
      }
    }

    if (onlyPublished) {
      return INITIAL_TRANSPORT_SERVICES.filter(
        (t) => t.provider_id === providerId && t.status === "published"
      );
    }

    return [];
  }

  public static async getPublishedTransportById(id: string): Promise<TransportListItem | null> {
    if (!id) return null;

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      try {
        const supabase = createPublicServerSupabaseClient();
        const { data, error } = await (supabase.from("transport_services") as any)
          .select(TRANSPORT_SELECT)
          .eq("id", id)
          .eq("status", "published")
          .maybeSingle();

        if (!error && data) {
          return mapTransportRow(data as Record<string, unknown>);
        }
      } catch (err) {
        console.warn("[TransportService.getPublishedTransportById] DB read failed:", err);
      }
    }

    return null;
  }

  public static async getOwnedTransportById(
    providerId: string,
    transportId: string
  ): Promise<TransportListItem | null> {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      try {
        const supabase = await getTransportWritableClient();
        const { data, error } = await (supabase.from("transport_services") as any)
          .select(TRANSPORT_SELECT)
          .eq("id", transportId)
          .eq("provider_id", providerId)
          .maybeSingle();

        if (!error && data) {
          return mapTransportRow(data as Record<string, unknown>);
        }
      } catch (err) {
        console.warn("[TransportService.getOwnedTransportById] DB read failed:", err);
      }
    }

    return null;
  }

  public static async getOwnedTransportBySlug(
    providerId: string,
    slug: string
  ): Promise<TransportListItem | null> {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      try {
        const supabase = await getTransportWritableClient();
        const { data, error } = await (supabase.from("transport_services") as any)
          .select(TRANSPORT_SELECT)
          .eq("slug", slug)
          .eq("provider_id", providerId)
          .maybeSingle();

        if (!error && data) {
          return mapTransportRow(data as Record<string, unknown>);
        }
      } catch (err) {
        console.warn("[TransportService.getOwnedTransportBySlug] DB read failed:", err);
      }
    }

    return null;
  }

  public static async getOwnedTransports(providerId: string): Promise<TransportListItem[]> {
    return this.getProviderTransports(providerId, false);
  }

  public static buildSlug(title: string): string {
    const base = slugify(title) || "transporte";
    return `${base}-${Math.random().toString(36).substring(2, 6)}`;
  }

  public static formatPrice(amount: number, currency = "AOA"): string {
    return `${amount.toLocaleString("pt-AO")} ${currency === "AOA" ? "Kz" : currency}`;
  }

  public static mapTransportRow(item: Record<string, unknown>): TransportListItem {
    return mapTransportRow(item);
  }

  public static mapRequestRow(row: Record<string, unknown>): TransportRequestItem {
    const customer = asRelatedRecord(row.profiles);
    const provider = asRelatedRecord(row.provider_profiles);
    const transport = asRelatedRecord(row.transport_services);
    const originNotes = (row.origin_notes as string) || null;
    const destinationNotes = (row.destination_notes as string) || null;
    const originLabel = (transport?.origin_label as string) || null;
    const destinationLabel = (transport?.destination_label as string) || null;
    const orderLink = extractOrderExpeditionLink(row);

    return {
      id: String(row.id),
      customer_id: String(row.customer_id),
      customer_name: (customer?.display_name as string) || null,
      provider_id: String(row.provider_id),
      provider_name: (provider?.business_name as string) || null,
      transport_service_id: row.transport_service_id ? String(row.transport_service_id) : null,
      transport_title: (transport?.title as string) || null,
      transport_slug: (transport?.slug as string) || null,
      order_id: orderLink.orderId,
      seller_group_id: orderLink.sellerGroupId,
      request_source: orderLink.requestSource,
      order_number: orderLink.orderNumber,
      status: row.status as TransportRequestStatus,
      message: (row.message as string) || null,
      origin_notes: originNotes,
      destination_notes: destinationNotes,
      origin: originNotes || originLabel,
      destination: destinationNotes || destinationLabel,
      vehicle_name: (transport?.vehicle_name as string) || null,
      vehicle_type: (transport?.vehicle_type as string) || null,
      vehicle_model: (transport?.vehicle_model as string) || null,
      capacity_load: (transport?.capacity_load as string) || null,
      requested_date: (row.requested_date as string) || null,
      estimated_trip_price: row.estimated_trip_price != null ? Number(row.estimated_trip_price) : null,
      estimated_load_price: row.estimated_load_price != null ? Number(row.estimated_load_price) : null,
      currency: String(row.currency || "AOA"),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
  }
}
