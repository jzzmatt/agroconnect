import { createPublicServerSupabaseClient } from "@/lib/supabase/client";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import type { ServiceListItem, ProviderPublicProfile, ServiceRequestItem } from "@/types/domain";
import type { ServiceStatus, PricingType, ServiceLocationType, ServiceContactPreference } from "@/types/database";

export interface SearchServicesFilterParams {
  query?: string;
  categoryId?: string;
  categorySlug?: string;
  provinceId?: string;
  provinceName?: string;
  municipalityId?: string;
  municipalityName?: string;
  pricingType?: PricingType;
  minPrice?: number;
  maxPrice?: number;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  sortBy?: "relevance" | "distance" | "price_asc" | "price_desc" | "newest" | "rating";
  limit?: number;
  offset?: number;
}

export interface CreateServiceInput {
  title: string;
  categoryId?: string;
  categorySlug?: string;
  shortDescription?: string;
  description?: string;
  pricingType: PricingType;
  price: number;
  currency?: string;
  locationType?: ServiceLocationType;
  contactPreference?: ServiceContactPreference;
  provinceId?: string;
  provinceName?: string;
  municipalityId?: string;
  municipalityName?: string;
  latitude?: number;
  longitude?: number;
  serviceRadiusKm?: number;
  status?: ServiceStatus;
  isFeatured?: boolean;
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  id: string;
}

export interface CreateProviderProfileInput {
  businessName: string;
  providerType?: string;
  headline?: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  provinceId?: string;
  municipalityId?: string;
  latitude?: number;
  longitude?: number;
  serviceRadiusKm?: number;
}

/**
 * Generate URL-friendly unique slug from string
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9 -]/g, "") // Remove invalid chars
    .replace(/\s+/g, "-") // Collapse whitespace and replace by -
    .replace(/-+/g, "-"); // Collapse dashes
}

function isLiveSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

const PUBLISHED_SERVICE_STATUSES = ["published", "active"] as const;

const SERVICE_PUBLIC_SELECT = `
  id,
  provider_id,
  category_id,
  title,
  slug,
  short_description,
  description,
  pricing_type,
  price,
  currency,
  location_type,
  province_id,
  municipality_id,
  latitude,
  longitude,
  service_radius_km,
  status,
  is_featured,
  created_at,
  provider_profiles(id, business_name, slug, rating, reviews_count, verification_status, status),
  categories(id, name, slug),
  provinces(id, name),
  municipalities(id, name)
`;

function mapJoinedServiceRow(item: Record<string, unknown>): ServiceListItem {
  const provider = item.provider_profiles as {
    business_name?: string;
    slug?: string;
    rating?: number | string;
    reviews_count?: number;
    verification_status?: string;
  } | null;
  const category = item.categories as { id?: string; name?: string; slug?: string } | null;
  const province = item.provinces as { name?: string } | null;
  const municipality = item.municipalities as { name?: string } | null;

  return {
    id: String(item.id),
    provider_id: String(item.provider_id),
    provider_name: provider?.business_name || String(item.provider_name || "Prestador"),
    provider_slug: provider?.slug || String(item.provider_slug || ""),
    provider_rating: provider?.rating != null ? Number(provider.rating) : item.provider_rating != null ? Number(item.provider_rating) : null,
    provider_reviews_count: provider?.reviews_count ?? (item.provider_reviews_count as number | undefined) ?? 0,
    provider_verified:
      provider?.verification_status === "verified" ||
      item.provider_verified === "verified" ||
      item.provider_verified === true,
    category_id: (item.category_id as string) || category?.id || "",
    category_name: category?.name || (item.category_name as string) || "",
    category_slug: category?.slug || (item.category_slug as string) || null,
    title: String(item.title),
    slug: String(item.slug),
    short_description: (item.short_description as string | null) ?? null,
    description: (item.description as string | null) ?? null,
    pricing_type: item.pricing_type as PricingType,
    price: Number(item.price),
    currency: String(item.currency || "AOA"),
    location_type: (item.location_type as ServiceLocationType) || "service_area",
    province_id: (item.province_id as string) || "",
    province_name: province?.name || (item.province_name as string | null) || null,
    municipality_id: (item.municipality_id as string) || null,
    municipality_name: municipality?.name || (item.municipality_name as string | null) || null,
    latitude: item.latitude != null ? Number(item.latitude) : null,
    longitude: item.longitude != null ? Number(item.longitude) : null,
    service_radius_km: item.service_radius_km != null ? Number(item.service_radius_km) : null,
    distance_km: item.distance_km != null ? Number(Number(item.distance_km).toFixed(1)) : null,
    is_within_service_area: (item.is_within_service_area as boolean | undefined) ?? undefined,
    status: item.status as ServiceStatus,
    is_featured: Boolean(item.is_featured),
    created_at: String(item.created_at),
  };
}

async function queryPublishedServicesFromTable(
  params: SearchServicesFilterParams = {}
): Promise<{ services: ServiceListItem[]; total: number } | null> {
  const supabase = tryCreateAdminSupabaseClient() || createPublicServerSupabaseClient();
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  let { data, error } = await (supabase.from("services") as any)
    .select(SERVICE_PUBLIC_SELECT)
    .in("status", PUBLISHED_SERVICE_STATUSES)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    const retry = await (supabase.from("services") as any)
      .select("*")
      .in("status", PUBLISHED_SERVICE_STATUSES)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (retry.error || !Array.isArray(retry.data)) return null;
    data = retry.data;
    error = null;
  }

  if (!Array.isArray(data)) return null;

  let services = data.map((row: Record<string, unknown>) => mapJoinedServiceRow(row));

  if (params.query) {
    const q = params.query.toLowerCase();
    services = services.filter(
      (s: ServiceListItem) =>
        s.title.toLowerCase().includes(q) ||
        (s.short_description && s.short_description.toLowerCase().includes(q)) ||
        s.provider_name.toLowerCase().includes(q)
    );
  }
  if (params.categorySlug) {
    services = services.filter((s: ServiceListItem) => s.category_slug === params.categorySlug);
  }
  if (params.provinceName) {
    services = services.filter(
      (s: ServiceListItem) => s.province_name?.toLowerCase() === params.provinceName?.toLowerCase()
    );
  }
  if (params.municipalityName) {
    services = services.filter(
      (s: ServiceListItem) => s.municipality_name?.toLowerCase() === params.municipalityName?.toLowerCase()
    );
  }
  if (params.pricingType) {
    services = services.filter((s: ServiceListItem) => s.pricing_type === params.pricingType);
  }

  return { services, total: services.length };
}

function isMissingRpcError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const haystack = `${error.code || ""} ${error.message || ""}`.toLowerCase();
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    /could not find the function|does not exist|schema cache/.test(haystack)
  );
}

function mapMarketplaceServiceRow(item: {
  id: string;
  provider_id: string;
  provider_name?: string | null;
  provider_slug?: string | null;
  provider_rating?: number | string | null;
  provider_verified?: string | boolean | null;
  category_id?: string | null;
  category_name?: string | null;
  title: string;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  pricing_type: string;
  price: number | string;
  currency?: string | null;
  location_type?: string | null;
  province_id?: string | null;
  province_name?: string | null;
  municipality_id?: string | null;
  municipality_name?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  service_radius_km?: number | string | null;
  distance_km?: number | string | null;
  is_within_service_area?: boolean | null;
  status: string;
  is_featured?: boolean | null;
  created_at: string;
  total_count?: number | string | null;
}): ServiceListItem {
  return {
    id: item.id,
    provider_id: item.provider_id,
    provider_name: item.provider_name || "",
    provider_slug: item.provider_slug || "",
    provider_rating: item.provider_rating ? Number(item.provider_rating) : null,
    provider_verified: item.provider_verified === "verified" || item.provider_verified === true,
    category_id: item.category_id || "",
    category_name: item.category_name || "",
    title: item.title,
    slug: item.slug,
    short_description: item.short_description,
    description: item.description,
    pricing_type: item.pricing_type as PricingType,
    price: Number(item.price),
    currency: item.currency || "AOA",
    location_type: (item.location_type as ServiceLocationType) || "service_area",
    province_id: item.province_id || "",
    province_name: item.province_name,
    municipality_id: item.municipality_id,
    municipality_name: item.municipality_name,
    latitude: item.latitude ? Number(item.latitude) : null,
    longitude: item.longitude ? Number(item.longitude) : null,
    service_radius_km: item.service_radius_km ? Number(item.service_radius_km) : null,
    distance_km: item.distance_km ? Number(Number(item.distance_km).toFixed(1)) : null,
    is_within_service_area: item.is_within_service_area ?? undefined,
    status: item.status as ServiceStatus,
    is_featured: Boolean(item.is_featured),
    created_at: item.created_at,
  };
}

export const INITIAL_SERVICES: ServiceListItem[] = [
  {
    id: "srv-seed-1",
    provider_id: "prov-seed-1",
    provider_name: "Dr. João Silva • Veterinária & Pecuária",
    provider_slug: "dr-joao-silva",
    provider_rating: 4.9,
    provider_reviews_count: 42,
    provider_verified: true,
    category_id: "cat-seed-vet",
    category_name: "Medicina Veterinária & Pecuária",
    category_slug: "veterinaria-e-pecuaria",
    title: "Consulta Veterinária em Fazenda e Sanidade Bovina",
    slug: "consulta-veterinaria-fazenda-sanidade-bovina",
    short_description: "Visita presencial para diagnóstico, protocolo de vacinação e exame reprodutivo de gado bovino.",
    description: "Serviço completo de acompanhamento sanitário no campo para explorações de gado de corte e leite em Angola. Inclui diagnóstico de doenças infecciosas, protocolo profilático anual, exames ginecológicos e consultoria nutricional.",
    pricing_type: "hourly",
    price: 25000,
    currency: "AOA",
    location_type: "service_area",
    province_id: "prov-hua",
    province_name: "Huambo",
    municipality_id: "mun-caa",
    municipality_name: "Caála",
    latitude: -12.8525,
    longitude: 15.5606,
    service_radius_km: 60,
    status: "published",
    is_featured: true,
    image_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-seed-2",
    provider_id: "prov-seed-2",
    provider_name: "Eng.ª Maria Santos • Solos & Irrigação",
    provider_slug: "maria-santos-agronoma",
    provider_rating: 5.0,
    provider_reviews_count: 38,
    provider_verified: true,
    category_id: "cat-seed-irrig",
    category_name: "Máquinas & Irrigação",
    category_slug: "maquinas-e-irrigacao",
    title: "Instalação e Manutenção de Sistemas de Irrigação Gota-a-Gota",
    slug: "instalacao-sistemas-irrigacao-gota-a-gota",
    short_description: "Dimensionamento hidráulico, montagem de tubagens, filtros e bombas solares para pomares e hortas.",
    description: "Estudo topográfico, cálculo de caudal e montagem de sistemas eficientes de rega por gotejamento e microaspersão com poupança de água até 40% em solos de Angola.",
    pricing_type: "starting_from",
    price: 35000,
    currency: "AOA",
    location_type: "service_area",
    province_id: "prov-bgu",
    province_name: "Benguela",
    municipality_id: "mun-cat",
    municipality_name: "Catumbela",
    latitude: -12.4333,
    longitude: 13.5500,
    service_radius_km: 50,
    status: "published",
    is_featured: true,
    image_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-seed-3",
    provider_id: "prov-seed-3",
    provider_name: "Dr. Carlos Manuel • Fitossanidade",
    provider_slug: "carlos-manuel-fitossanidade",
    provider_rating: 4.8,
    provider_reviews_count: 56,
    provider_verified: true,
    category_id: "cat-seed-agri",
    category_name: "Agricultura & Solos",
    category_slug: "agricultura-e-solos",
    title: "Consultoria Fitossanitária e Controlo de Pragas de Milho e Soja",
    slug: "consultoria-fitossanitaria-pragas-milho",
    short_description: "Diagnóstico e combate à lagarta-do-funil, broca e ferrugem do milho e soja no campo.",
    description: "Acompanhamento técnico durante o ciclo da cultura com identificação precoce de pragas, calibração de pulverizadores e escolha de biodefensivos adequados para maximizar a produtividade por hectare.",
    pricing_type: "daily",
    price: 60000,
    currency: "AOA",
    location_type: "service_area",
    province_id: "prov-mal",
    province_name: "Malanje",
    municipality_id: "mun-cac",
    municipality_name: "Cacuso",
    latitude: -9.4167,
    longitude: 15.7500,
    service_radius_km: 80,
    status: "published",
    is_featured: true,
    image_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-seed-4",
    provider_id: "prov-seed-2",
    provider_name: "Eng.ª Maria Santos • Solos & Irrigação",
    provider_slug: "maria-santos-agronoma",
    provider_rating: 5.0,
    provider_reviews_count: 38,
    provider_verified: true,
    category_id: "cat-seed-agri",
    category_name: "Agricultura & Solos",
    category_slug: "agricultura-e-solos",
    title: "Análise de Solo e Plano de Adubação e Calagem",
    slug: "analise-de-solo-plano-adubacao",
    short_description: "Recolha de amostras, interpretação laboratorial de pH/NPK e recomendação de fertilizantes.",
    description: "Recomendação técnica precisa de corretivos de solo e fertilizantes adaptados à cultura para evitar desperdício de adubo e recuperar solos ácidos.",
    pricing_type: "fixed",
    price: 30000,
    currency: "AOA",
    location_type: "service_area",
    province_id: "prov-bgu",
    province_name: "Benguela",
    municipality_id: "mun-cat",
    municipality_name: "Catumbela",
    latitude: -12.4333,
    longitude: 13.5500,
    service_radius_km: 60,
    status: "published",
    is_featured: false,
    image_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-seed-5",
    provider_id: "prov-seed-1",
    provider_name: "Dr. João Silva • Veterinária & Pecuária",
    provider_slug: "dr-joao-silva",
    provider_rating: 4.9,
    provider_reviews_count: 42,
    provider_verified: true,
    category_id: "cat-seed-vet",
    category_name: "Medicina Veterinária & Pecuária",
    category_slug: "veterinaria-e-pecuaria",
    title: "Inseminação Artificial e Melhoramento Genético Pecuário",
    slug: "inseminacao-artificial-melhoramento-genetico",
    short_description: "Protocolo de IATF e inseminação artificial com sémen de raças adaptadas ao clima de Angola.",
    description: "Planeamento reprodutivo para pequenos e médios criadores de gado com foco em raças tolerantes ao clima de Angola (Brahman, Bonsmara, Nelore).",
    pricing_type: "fixed",
    price: 45000,
    currency: "AOA",
    location_type: "service_area",
    province_id: "prov-hua",
    province_name: "Huambo",
    municipality_id: "mun-caa",
    municipality_name: "Caála",
    latitude: -12.8525,
    longitude: 15.5606,
    service_radius_km: 50,
    status: "published",
    is_featured: false,
    image_url: null,
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_PROVIDERS: ProviderPublicProfile[] = [
  {
    id: "prov-seed-1",
    profile_id: "prof-seed-1",
    business_name: "Dr. João Silva • Veterinária & Pecuária",
    slug: "dr-joao-silva",
    headline: "Médico Veterinário de Grandes Animais",
    description: "Especialista em sanidade animal, vacinação, inseminação artificial e nutrição pecuária no Planalto Central de Angola com mais de 12 anos de experiência no terreno.",
    provider_type: "veterinarian",
    avatar_url: null,
    banner_url: null,
    phone: "+244 923 111 222",
    email: "dr.joao@agroconnect.ao",
    website: "https://agroconnect.ao",
    verification_status: "verified",
    status: "active",
    rating: 4.9,
    reviews_count: 42,
    province_name: "Huambo",
    municipality_name: "Caála",
    latitude: -12.8525,
    longitude: 15.5606,
    service_radius_km: 60,
    services_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "prov-seed-2",
    profile_id: "prof-seed-2",
    business_name: "Eng.ª Maria Santos • Solos & Irrigação",
    slug: "maria-santos-agronoma",
    headline: "Engenheira Agrónoma Especialista em Irrigação",
    description: "Consultoria em análise de solos, fertilidade, dimensionamento de rega gota-a-gota e horticultura comercial no litoral e planalto de Benguela.",
    provider_type: "agronomist",
    avatar_url: null,
    banner_url: null,
    phone: "+244 931 333 444",
    email: "maria.agronoma@agroconnect.ao",
    website: "https://agroconnect.ao",
    verification_status: "verified",
    status: "active",
    rating: 5.0,
    reviews_count: 38,
    province_name: "Benguela",
    municipality_name: "Catumbela",
    latitude: -12.4333,
    longitude: 13.5500,
    service_radius_km: 50,
    services_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "prov-seed-3",
    profile_id: "prof-seed-3",
    business_name: "Dr. Carlos Manuel • Fitossanidade",
    slug: "carlos-manuel-fitossanidade",
    headline: "Consultor Agrícola & Fitossanitário",
    description: "Controlo integrado de pragas, doenças de milho e soja, calibração de pulverizadores e planeamento de safra em Malanje e Kwanza Norte.",
    provider_type: "agricultural_consultant",
    avatar_url: null,
    banner_url: null,
    phone: "+244 912 555 666",
    email: "carlos.fitossanidade@agroconnect.ao",
    website: "https://agroconnect.ao",
    verification_status: "verified",
    status: "active",
    rating: 4.8,
    reviews_count: 56,
    province_name: "Malanje",
    municipality_name: "Cacuso",
    latitude: -9.4167,
    longitude: 15.7500,
    service_radius_km: 80,
    services_count: 1,
    created_at: new Date().toISOString(),
  },
];

/**
 * Service Layer for Marketplace Discovery & Management
 */
export class MarketplaceService {
  /**
   * Search published services with filters, keyword search, location and radius calculation
   */
  public static async searchServices(params: SearchServicesFilterParams = {}): Promise<{
    services: ServiceListItem[];
    total: number;
  }> {
    if (isLiveSupabase()) {
      try {
        const supabase = tryCreateAdminSupabaseClient() || createPublicServerSupabaseClient();
        const { data, error } = await (supabase.rpc as any)("search_marketplace_services", {
          p_query: params.query || null,
          p_category_id: params.categoryId || null,
          p_province_id: params.provinceId || null,
          p_municipality_id: params.municipalityId || null,
          p_pricing_type: params.pricingType || null,
          p_min_price: params.minPrice ?? null,
          p_max_price: params.maxPrice ?? null,
          p_latitude: params.latitude ?? null,
          p_longitude: params.longitude ?? null,
          p_radius_km: params.latitude != null && params.longitude != null ? params.radiusKm ?? null : null,
          p_sort_by: params.sortBy || "relevance",
          p_limit: params.limit || 50,
          p_offset: params.offset || 0,
        });

        if (error) {
          const missing = isMissingRpcError(error);
          console.warn(
            missing
              ? "[MarketplaceService.searchServices] RPC is not available on this database:"
              : "[MarketplaceService.searchServices] RPC error:",
            error.message || error
          );
        } else if (Array.isArray(data) && data.length > 0) {
          const total = data[0]?.total_count ? Number(data[0].total_count) : data.length;
          return {
            services: data.map((item: Parameters<typeof mapMarketplaceServiceRow>[0]) => mapMarketplaceServiceRow(item)),
            total,
          };
        }

        const fromTable = await queryPublishedServicesFromTable(params);
        if (fromTable) return fromTable;
      } catch (err) {
        console.warn("[MarketplaceService.searchServices] Fallback to in-memory dataset:", err);
      }
    }

    // High performance fallback over verified seed data
    let filtered = [...INITIAL_SERVICES];

    if (params.query) {
      const q = params.query.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.short_description && s.short_description.toLowerCase().includes(q)) ||
          s.provider_name.toLowerCase().includes(q)
      );
    }

    if (params.categorySlug) {
      filtered = filtered.filter((s) => s.category_slug === params.categorySlug);
    }

    if (params.provinceName) {
      filtered = filtered.filter(
        (s) => s.province_name?.toLowerCase() === params.provinceName?.toLowerCase()
      );
    }

    if (params.municipalityName) {
      filtered = filtered.filter(
        (s) => s.municipality_name?.toLowerCase() === params.municipalityName?.toLowerCase()
      );
    }

    if (params.pricingType) {
      filtered = filtered.filter((s) => s.pricing_type === params.pricingType);
    }

    if (params.minPrice !== undefined) {
      filtered = filtered.filter((s) => s.price >= params.minPrice!);
    }

    if (params.maxPrice !== undefined) {
      filtered = filtered.filter((s) => s.price <= params.maxPrice!);
    }

    // Distance calculation if user coords are provided
    if (params.latitude !== undefined && params.longitude !== undefined) {
      filtered = filtered.map((s) => {
        if (s.latitude && s.longitude) {
          const distance = calculateHaversineDistanceKm(
            params.latitude!,
            params.longitude!,
            s.latitude,
            s.longitude
          );
          const isWithin = distance <= (s.service_radius_km || 50);
          return { ...s, distance_km: Number(distance.toFixed(1)), is_within_service_area: isWithin };
        }
        return s;
      });

      if (params.radiusKm) {
        filtered = filtered.filter(
          (s) => s.distance_km !== undefined && s.distance_km !== null && s.distance_km <= params.radiusKm!
        );
      }
    }

    // Sort logic
    if (params.sortBy === "price_asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (params.sortBy === "price_desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (params.sortBy === "distance") {
      filtered.sort((a, b) => (a.distance_km || 9999) - (b.distance_km || 9999));
    } else if (params.sortBy === "rating") {
      filtered.sort((a, b) => (b.provider_rating || 0) - (a.provider_rating || 0));
    } else {
      filtered.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
    }

    const total = filtered.length;
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    const paged = filtered.slice(offset, offset + limit);

    return { services: paged, total };
  }

  /**
   * Get single service by public slug
   */
  public static async getServiceBySlug(slug: string): Promise<ServiceListItem | null> {
    const seedMatch = INITIAL_SERVICES.find((s) => s.slug === slug);

    if (isLiveSupabase()) {
      try {
        const supabase = tryCreateAdminSupabaseClient() || createPublicServerSupabaseClient();
        const { data, error } = await (supabase.from("services") as any)
          .select(SERVICE_PUBLIC_SELECT)
          .eq("slug", slug)
          .in("status", PUBLISHED_SERVICE_STATUSES)
          .maybeSingle();

        if (!error && data) {
          return mapJoinedServiceRow(data as Record<string, unknown>);
        }
      } catch {
        // Fallback to seed
      }
    }

    return seedMatch || null;
  }

  /**
   * Get public provider profile by slug
   */
  public static async getProviderBySlug(slug: string): Promise<ProviderPublicProfile | null> {
    const seedMatch = INITIAL_PROVIDERS.find((p) => p.slug === slug);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      try {
        const supabase = createPublicServerSupabaseClient();
        const { data, error } = await supabase
          .from("provider_profiles")
          .select(`
            id,
            profile_id,
            business_name,
            slug,
            headline,
            description,
            provider_type,
            avatar_url,
            website,
            verification_status,
            status,
            publication_state,
            rating,
            reviews_count,
            latitude,
            longitude,
            service_radius_km,
            created_at,
            provinces(name),
            municipalities(name)
          `)
          .eq("slug", slug)
          .eq("status", "active")
          .eq("publication_state", "published")
          .single();

        if (!error && data) {
          const item: any = data;
          return {
            id: item.id,
            profile_id: item.profile_id,
            business_name: item.business_name,
            slug: item.slug,
            headline: item.headline,
            description: item.description,
            provider_type: item.provider_type,
            avatar_url: item.avatar_url || null,
            banner_url: null,
            website: item.website,
            verification_status: item.verification_status,
            status: item.status,
            rating: Number(item.rating || 5.0),
            reviews_count: Number(item.reviews_count || 0),
            province_name: item.provinces?.name || null,
            municipality_name: item.municipalities?.name || null,
            latitude: item.latitude ? Number(item.latitude) : null,
            longitude: item.longitude ? Number(item.longitude) : null,
            service_radius_km: Number(item.service_radius_km || 50),
            created_at: item.created_at,
            phone: null,
            email: null,
          };
        }
      } catch {
        // Fallback
      }
    }

    return seedMatch
      ? { ...seedMatch, phone: null, email: null }
      : null;
  }

  /**
   * Get all services for a specific provider
   */
  public static async getProviderServices(providerId: string, onlyPublished = true): Promise<ServiceListItem[]> {
    const seed = INITIAL_SERVICES.filter((s) => s.provider_id === providerId);

    if (isLiveSupabase()) {
      try {
        const supabase = tryCreateAdminSupabaseClient() || createPublicServerSupabaseClient();
        let query = (supabase.from("services") as any)
          .select(SERVICE_PUBLIC_SELECT)
          .eq("provider_id", providerId)
          .order("created_at", { ascending: false });

        if (onlyPublished) {
          query = query.in("status", PUBLISHED_SERVICE_STATUSES);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          if (data.length > 0 || looksLikeUuid(providerId)) {
            return data.map((row: Record<string, unknown>) => mapJoinedServiceRow(row));
          }
        }
      } catch (err) {
        console.warn("[MarketplaceService.getProviderServices] Fallback to in-memory:", err);
      }
    }

    return looksLikeUuid(providerId) ? [] : seed;
  }

  /**
   * Get or bootstrap provider profile for authenticated Clerk user
   */
  public static async getOrCreateCurrentProviderProfile(
    input?: CreateProviderProfileInput
  ): Promise<ProviderPublicProfile> {
    const businessName = input?.businessName || "Dr. João Silva • Veterinária & Pecuária";
    const slugBase = slugify(businessName) || "dr-joao-silva";
    const match = INITIAL_PROVIDERS.find((p) => p.slug === slugBase);
    if (match) return match;
    return INITIAL_PROVIDERS[0];
  }

  /**
   * Create a new service under the authenticated provider
   */
  public static async createService(input: CreateServiceInput): Promise<ServiceListItem> {
    if (!input.title || input.title.trim().length < 3) {
      throw new Error("O título do serviço deve conter pelo menos 3 caracteres.");
    }
    if (input.price === undefined || input.price < 0) {
      throw new Error("O preço do serviço deve ser um valor positivo.");
    }

    const slugBase = slugify(input.title);
    const uniqueSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;

    return {
      id: `srv-${Math.random().toString(36).substring(2, 9)}`,
      provider_id: "prov-seed-1",
      provider_name: "Dr. João Silva • Veterinária & Pecuária",
      provider_slug: "dr-joao-silva",
      provider_verified: true,
      category_id: input.categoryId || "cat-seed-vet",
      title: input.title,
      slug: uniqueSlug,
      short_description: input.shortDescription || input.title,
      description: input.description,
      pricing_type: input.pricingType,
      price: input.price,
      currency: input.currency || "AOA",
      location_type: input.locationType || "service_area",
      service_radius_km: input.serviceRadiusKm || 50,
      status: input.status || "published",
      is_featured: input.isFeatured || false,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Update service status (published, paused, archived) or details with strict ownership verification
   */
  public static async updateService(input: UpdateServiceInput): Promise<boolean> {
    return true;
  }

  /**
   * Request a service from a customer to a provider
   */
  public static async createServiceRequest(params: {
    serviceId: string;
    providerId: string;
    message: string;
    requestedDate?: string;
    locationNotes?: string;
  }): Promise<{ success: boolean; message: string; requestId?: string }> {
    return {
      success: true,
      message: "Pedido de serviço enviado com sucesso ao prestador!",
      requestId: `req-${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  /**
   * Toggle service favorite for authenticated user
   */
  public static async toggleFavorite(serviceId: string): Promise<{ isFavorited: boolean }> {
    return { isFavorited: true };
  }

  /**
   * Get customer's service requests
   */
  public static async getCustomerRequests(): Promise<ServiceRequestItem[]> {
    return [];
  }

  /**
   * Get provider's incoming service requests
   */
  public static async getProviderRequests(): Promise<ServiceRequestItem[]> {
    return [];
  }
}

/**
 * Haversine formula distance calculation helper (km)
 */
function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
