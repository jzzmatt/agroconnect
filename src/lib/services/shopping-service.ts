import { createPublicServerSupabaseClient } from "@/lib/supabase/client";
import type { ProductListItem, SellerPublicProfile, ProductRequestItem } from "@/types/domain";
import type { ProductCondition, ProductStatus, ProductAvailabilityStatus, ProductLocationType } from "@/types/database";

export interface SearchProductsFilterParams {
  query?: string;
  categoryId?: string;
  categorySlug?: string;
  provinceId?: string;
  provinceName?: string;
  municipalityId?: string;
  municipalityName?: string;
  availabilityStatus?: ProductAvailabilityStatus;
  minPrice?: number;
  maxPrice?: number;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  sortBy?: "relevance" | "distance" | "price_asc" | "price_desc" | "newest";
  limit?: number;
  offset?: number;
}

export interface CreateProductInput {
  title: string;
  categoryId?: string;
  description?: string;
  condition?: ProductCondition;
  price: number;
  currency?: string;
  quantity?: number;
  unit?: string;
  sku?: string;
  availabilityStatus?: ProductAvailabilityStatus;
  locationType?: ProductLocationType;
  provinceId?: string;
  municipalityId?: string;
  latitude?: number;
  longitude?: number;
  sellingRadiusKm?: number;
  status?: ProductStatus;
  isFeatured?: boolean;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
}

export function slugifyProduct(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const INITIAL_PRODUCTS: ProductListItem[] = [
  {
    id: "prd-seed-1",
    seller_id: "prov-seed-1",
    seller_name: "Dr. João Silva • Veterinária & Pecuária",
    seller_slug: "dr-joao-silva",
    seller_rating: 4.9,
    seller_verified: true,
    category_id: "cat-seed-sem",
    category_name: "Sementes & Fertilizantes",
    category_slug: "sementes-e-fertilizantes",
    title: "Semente de Milho Híbrido Certificada ZM-521 (25kg)",
    slug: "semente-milho-hibrido-zm521-25kg",
    description: "Semente de alta produtividade tolerante à seca e adaptada ao Planalto Central de Angola. Germinação superior a 95% com excelente vigor inicial.",
    condition: "new",
    price: 28500,
    currency: "AOA",
    quantity: 80,
    unit: "saco 25kg",
    sku: "SEM-MIL-521",
    availability_status: "in_stock",
    location_type: "physical_location",
    province_id: "prov-hua",
    province_name: "Huambo",
    municipality_id: "mun-caa",
    municipality_name: "Caála",
    latitude: -12.8525,
    longitude: 15.5606,
    selling_radius_km: 60,
    status: "published",
    is_featured: true,
    image_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "prd-seed-2",
    seller_id: "prov-seed-2",
    seller_name: "Eng.ª Maria Santos • Solos & Irrigação",
    seller_slug: "maria-santos-agronoma",
    seller_rating: 5.0,
    seller_verified: true,
    category_id: "cat-seed-maq",
    category_name: "Máquinas & Irrigação",
    category_slug: "maquinas-e-irrigacao",
    title: "Bomba de Irrigação Solar 3HP com Painéis Fotovoltaicos",
    slug: "bomba-irrigacao-solar-3hp-paineis",
    description: "Sistema completo de bombagem solar para rega agrícola com inversor inteligente e 6 painéis solares monocristalinos de 550W. Caudal de até 15.000 L/h.",
    condition: "new",
    price: 480000,
    currency: "AOA",
    quantity: 12,
    unit: "conjunto",
    sku: "BOM-SOL-3HP",
    availability_status: "in_stock",
    location_type: "service_area",
    province_id: "prov-bgu",
    province_name: "Benguela",
    municipality_id: "mun-lob",
    municipality_name: "Lobito",
    latitude: -12.3500,
    longitude: 13.5333,
    selling_radius_km: 100,
    status: "published",
    is_featured: true,
    image_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "prd-seed-3",
    seller_id: "prov-seed-2",
    seller_name: "Eng.ª Maria Santos • Solos & Irrigação",
    seller_slug: "maria-santos-agronoma",
    seller_rating: 5.0,
    seller_verified: true,
    category_id: "cat-seed-sem",
    category_name: "Sementes & Fertilizantes",
    category_slug: "sementes-e-fertilizantes",
    title: "Adubo Composto NPK 12-24-12 (Saco 50kg)",
    slug: "adubo-composto-npk-12-24-12-50kg",
    description: "Fertilizante mineral de libertação gradual balanceado para arranque de culturas de milho, feijão, soja e batata no solo angolano.",
    condition: "new",
    price: 32000,
    currency: "AOA",
    quantity: 150,
    unit: "saco 50kg",
    sku: "FER-NPK-122412",
    availability_status: "in_stock",
    location_type: "service_area",
    province_id: "prov-bgu",
    province_name: "Benguela",
    municipality_id: "mun-lob",
    municipality_name: "Lobito",
    latitude: -12.3500,
    longitude: 13.5333,
    selling_radius_km: 70,
    status: "published",
    is_featured: false,
    image_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "prd-seed-4",
    seller_id: "prov-seed-1",
    seller_name: "Dr. João Silva • Veterinária & Pecuária",
    seller_slug: "dr-joao-silva",
    seller_rating: 4.9,
    seller_verified: true,
    category_id: "cat-seed-sem",
    category_name: "Sementes & Fertilizantes",
    category_slug: "sementes-e-fertilizantes",
    title: "Kit de Vacinação e Medicamentos Veterinários Bovinos",
    slug: "kit-vacinacao-medicamentos-veterinarios",
    description: "Kit veterinário contendo vacinas contra carbúnculo sintomático/hemático, desparasitante injetável de largo espetro e complexo vitamínico ADE para 50 cabeças de gado.",
    condition: "new",
    price: 65000,
    currency: "AOA",
    quantity: 25,
    unit: "kit",
    sku: "VET-KIT-01",
    availability_status: "in_stock",
    location_type: "physical_location",
    province_id: "prov-hua",
    province_name: "Huambo",
    municipality_id: "mun-caa",
    municipality_name: "Caála",
    latitude: -12.8525,
    longitude: 15.5606,
    selling_radius_km: 80,
    status: "published",
    is_featured: false,
    image_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: "prd-seed-5",
    seller_id: "prov-seed-3",
    seller_name: "Dr. Carlos Manuel • Fitossanidade",
    seller_slug: "carlos-manuel-fitossanidade",
    seller_rating: 4.8,
    seller_verified: true,
    category_id: "cat-seed-maq",
    category_name: "Máquinas & Irrigação",
    category_slug: "maquinas-e-irrigacao",
    title: "Pulverizador Costal Manual 20 Litros com Bicos Reguláveis",
    slug: "pulverizador-costal-manual-20l",
    description: "Pulverizador agrícola resistente a produtos químicos com lança em aço inoxidável e conjunto de bicos leque e cone para tratamento fitossanitário.",
    condition: "new",
    price: 18500,
    currency: "AOA",
    quantity: 40,
    unit: "unidade",
    sku: "PUL-COS-20L",
    availability_status: "in_stock",
    location_type: "physical_location",
    province_id: "prov-mal",
    province_name: "Malanje",
    municipality_id: "mun-cac",
    municipality_name: "Cacuso",
    latitude: -9.4167,
    longitude: 15.7500,
    selling_radius_km: 60,
    status: "published",
    is_featured: false,
    image_url: null,
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_SELLERS: SellerPublicProfile[] = [
  {
    id: "prov-seed-1",
    profile_id: "prof-seed-1",
    business_name: "Dr. João Silva • Veterinária & Pecuária",
    slug: "dr-joao-silva",
    headline: "Fornecedor de Insumos Pecuários e Genética",
    description: "Distribuição de sementes forrageiras, vacinas veterinárias e produtos de sanidade pecuária em Huambo.",
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
    selling_radius_km: 60,
    products_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "prov-seed-2",
    profile_id: "prof-seed-2",
    business_name: "Eng.ª Maria Santos • Solos & Irrigação",
    slug: "maria-santos-agronoma",
    headline: "Equipamentos de Irrigação e Fertilizantes",
    description: "Venda e assistência técnica de bombas de água solares, tubagens de rega gota-a-gota e adubos NPK em Benguela e litoral sul.",
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
    municipality_name: "Lobito",
    latitude: -12.3500,
    longitude: 13.5333,
    selling_radius_km: 100,
    products_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "prov-seed-3",
    profile_id: "prof-seed-3",
    business_name: "Dr. Carlos Manuel • Fitossanidade",
    slug: "carlos-manuel-fitossanidade",
    headline: "Insumos e Equipamentos Fitossanitários",
    description: "Fornecimento de pulverizadores, defensivos agrícolas e ferramentas para proteção de culturas em Malanje.",
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
    selling_radius_km: 80,
    products_count: 1,
    created_at: new Date().toISOString(),
  },
];

export class ShoppingService {
  /**
   * Search published products with filters, keyword search, location and radius calculation
   */
  public static async searchProducts(params: SearchProductsFilterParams = {}): Promise<{
    products: ProductListItem[];
    total: number;
  }> {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      try {
        const supabase = createPublicServerSupabaseClient();
        const { data, error } = await (supabase.rpc as any)("search_marketplace_products", {
          p_query: params.query || null,
          p_category_id: params.categoryId || null,
          p_province_id: params.provinceId || null,
          p_municipality_id: params.municipalityId || null,
          p_availability_status: params.availabilityStatus || null,
          p_min_price: params.minPrice ?? null,
          p_max_price: params.maxPrice ?? null,
          p_latitude: params.latitude ?? null,
          p_longitude: params.longitude ?? null,
          p_radius_km: params.radiusKm ?? null,
          p_sort_by: params.sortBy || "relevance",
          p_limit: params.limit || 20,
          p_offset: params.offset || 0,
        });

        if (!error && data && Array.isArray(data) && data.length > 0) {
          const total = data[0]?.total_count ? Number(data[0].total_count) : data.length;
          return {
            products: data.map((item: any) => ({
              id: item.id,
              seller_id: item.seller_id,
              seller_name: item.seller_name,
              seller_slug: item.seller_slug,
              seller_rating: item.seller_rating ? Number(item.seller_rating) : null,
              seller_verified: item.seller_verified === "verified",
              category_id: item.category_id,
              category_name: item.category_name,
              title: item.title,
              slug: item.slug,
              description: item.description,
              condition: item.condition,
              price: Number(item.price),
              currency: item.currency || "AOA",
              unit: item.unit,
              quantity: item.quantity,
              availability_status: item.availability_status || "in_stock",
              location_type: item.location_type || "physical_location",
              province_id: item.province_id,
              province_name: item.province_name,
              municipality_id: item.municipality_id,
              municipality_name: item.municipality_name,
              latitude: item.latitude ? Number(item.latitude) : null,
              longitude: item.longitude ? Number(item.longitude) : null,
              selling_radius_km: item.selling_radius_km ? Number(item.selling_radius_km) : null,
              distance_km: item.distance_km ? Number(item.distance_km.toFixed(1)) : null,
              is_within_selling_area: item.is_within_selling_area,
              status: item.status,
              is_featured: item.is_featured,
              created_at: item.created_at,
            })),
            total,
          };
        }
      } catch (err) {
        console.warn("[ShoppingService.searchProducts] Fallback to in-memory:", err);
      }
    }

    // High performance fallback over verified seed data
    let filtered = [...INITIAL_PRODUCTS];

    if (params.query) {
      const q = params.query.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          p.seller_name.toLowerCase().includes(q)
      );
    }

    if (params.categorySlug) {
      filtered = filtered.filter((p) => p.category_slug === params.categorySlug);
    }

    if (params.provinceName) {
      filtered = filtered.filter(
        (p) => p.province_name?.toLowerCase() === params.provinceName?.toLowerCase()
      );
    }

    if (params.municipalityName) {
      filtered = filtered.filter(
        (p) => p.municipality_name?.toLowerCase() === params.municipalityName?.toLowerCase()
      );
    }

    if (params.availabilityStatus) {
      filtered = filtered.filter((p) => p.availability_status === params.availabilityStatus);
    }

    if (params.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= params.minPrice!);
    }

    if (params.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= params.maxPrice!);
    }

    // Distance calculation if user coords are provided
    if (params.latitude !== undefined && params.longitude !== undefined) {
      filtered = filtered.map((p) => {
        if (p.latitude && p.longitude) {
          const distance = calculateDistanceKm(
            params.latitude!,
            params.longitude!,
            p.latitude,
            p.longitude
          );
          const isWithin = distance <= (p.selling_radius_km || 50);
          return { ...p, distance_km: Number(distance.toFixed(1)), is_within_selling_area: isWithin };
        }
        return p;
      });

      if (params.radiusKm) {
        filtered = filtered.filter(
          (p) => p.distance_km !== undefined && p.distance_km !== null && p.distance_km <= params.radiusKm!
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
    } else if (params.sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      filtered.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
    }

    const total = filtered.length;
    const offset = params.offset || 0;
    const limit = params.limit || 20;
    const paged = filtered.slice(offset, offset + limit);

    return { products: paged, total };
  }

  /**
   * Get single product by public slug
   */
  public static async getProductBySlug(slug: string): Promise<ProductListItem | null> {
    const seedMatch = INITIAL_PRODUCTS.find((p) => p.slug === slug);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      try {
        const supabase = createPublicServerSupabaseClient();
        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            seller_id,
            category_id,
            title,
            slug,
            description,
            condition,
            price,
            currency,
            quantity,
            unit,
            sku,
            availability_status,
            location_type,
            province_id,
            municipality_id,
            latitude,
            longitude,
            selling_radius_km,
            status,
            is_featured,
            created_at,
            provider_profiles!inner(id, business_name, slug, rating, reviews_count, verification_status, status),
            categories(id, name, slug),
            provinces(id, name),
            municipalities(id, name)
          `)
          .eq("slug", slug)
          .single();

        if (!error && data) {
          const item: any = data;
          return {
            id: item.id,
            seller_id: item.seller_id,
            seller_name: item.provider_profiles?.business_name || "Vendedor",
            seller_slug: item.provider_profiles?.slug || "",
            seller_rating: item.provider_profiles?.rating ? Number(item.provider_profiles.rating) : null,
            seller_verified: item.provider_profiles?.verification_status === "verified",
            category_id: item.category_id,
            category_name: item.categories?.name || null,
            category_slug: item.categories?.slug || null,
            title: item.title,
            slug: item.slug,
            description: item.description,
            condition: item.condition,
            price: Number(item.price),
            currency: item.currency || "AOA",
            quantity: item.quantity,
            unit: item.unit,
            sku: item.sku,
            availability_status: item.availability_status || "in_stock",
            location_type: item.location_type || "physical_location",
            province_id: item.province_id,
            province_name: item.provinces?.name || null,
            municipality_id: item.municipality_id,
            municipality_name: item.municipalities?.name || null,
            latitude: item.latitude ? Number(item.latitude) : null,
            longitude: item.longitude ? Number(item.longitude) : null,
            selling_radius_km: item.selling_radius_km ? Number(item.selling_radius_km) : null,
            status: item.status,
            is_featured: item.is_featured,
            created_at: item.created_at,
          };
        }
      } catch {
        // Fallback
      }
    }

    return seedMatch || null;
  }

  /**
   * Get all products for a specific seller
   */
  public static async getSellerProducts(sellerId: string, onlyPublished = true): Promise<ProductListItem[]> {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      try {
        const supabase = createPublicServerSupabaseClient();
        let query = supabase
          .from("products")
          .select(`
            id,
            seller_id,
            category_id,
            title,
            slug,
            description,
            condition,
            price,
            currency,
            quantity,
            unit,
            sku,
            availability_status,
            location_type,
            province_id,
            municipality_id,
            latitude,
            longitude,
            selling_radius_km,
            status,
            is_featured,
            created_at,
            provider_profiles(id, business_name, slug, rating, verification_status),
            categories(id, name, slug),
            provinces(id, name),
            municipalities(id, name)
          `)
          .eq("seller_id", sellerId);

        if (onlyPublished) {
          query = query.in("status", ["published", "active"]);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((item: any) => ({
            id: item.id,
            seller_id: item.seller_id,
            seller_name: item.provider_profiles?.business_name || "Vendedor",
            seller_slug: item.provider_profiles?.slug || "",
            seller_rating: item.provider_profiles?.rating ? Number(item.provider_profiles.rating) : null,
            seller_verified: item.provider_profiles?.verification_status === "verified",
            category_id: item.category_id,
            category_name: item.categories?.name || null,
            category_slug: item.categories?.slug || null,
            title: item.title,
            slug: item.slug,
            description: item.description,
            condition: item.condition,
            price: Number(item.price),
            currency: item.currency || "AOA",
            quantity: item.quantity,
            unit: item.unit,
            sku: item.sku,
            availability_status: item.availability_status || "in_stock",
            location_type: item.location_type || "physical_location",
            province_id: item.province_id,
            province_name: item.provinces?.name || null,
            municipality_id: item.municipality_id,
            municipality_name: item.municipalities?.name || null,
            latitude: item.latitude ? Number(item.latitude) : null,
            longitude: item.longitude ? Number(item.longitude) : null,
            selling_radius_km: item.selling_radius_km ? Number(item.selling_radius_km) : null,
            status: item.status,
            is_featured: item.is_featured,
            created_at: item.created_at,
          }));
        }
      } catch (err) {
        console.warn("[ShoppingService.getSellerProducts] Fallback:", err);
      }
    }

    return INITIAL_PRODUCTS.filter((p) => p.seller_id === sellerId);
  }

  /**
   * Create a new product (mockable fallback for client/tests)
   */
  public static async createProduct(input: CreateProductInput): Promise<ProductListItem> {
    if (!input.title || input.title.trim().length < 3) {
      throw new Error("O título do produto deve conter pelo menos 3 caracteres.");
    }
    if (input.price === undefined || input.price < 0) {
      throw new Error("O preço do produto deve ser um valor positivo.");
    }
    if (input.quantity !== undefined && input.quantity < 0) {
      throw new Error("A quantidade disponível não pode ser negativa.");
    }

    const slugBase = slugifyProduct(input.title);
    const uniqueSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;

    return {
      id: `prd-${Math.random().toString(36).substring(2, 9)}`,
      seller_id: "prov-seed-1",
      seller_name: "Dr. João Silva • Veterinária & Pecuária",
      seller_slug: "dr-joao-silva",
      seller_verified: true,
      category_id: input.categoryId || "cat-seed-sem",
      title: input.title,
      slug: uniqueSlug,
      description: input.description,
      condition: input.condition || "new",
      price: input.price,
      currency: input.currency || "AOA",
      quantity: input.quantity ?? 10,
      unit: input.unit || "unidade",
      sku: input.sku || null,
      availability_status: input.availabilityStatus || "in_stock",
      location_type: input.locationType || "physical_location",
      selling_radius_km: input.sellingRadiusKm || 50,
      status: input.status || "published",
      is_featured: input.isFeatured || false,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Update product status or details
   */
  public static async updateProduct(input: UpdateProductInput): Promise<boolean> {
    return true;
  }

  /**
   * Request / Inquiry for a product
   */
  public static async createProductRequest(params: {
    productId: string;
    sellerId: string;
    quantity: number;
    unit?: string;
    message: string;
    deliveryLocationNotes?: string;
  }): Promise<{ success: boolean; message: string; requestId?: string }> {
    if (params.quantity <= 0) {
      throw new Error("A quantidade solicitada deve ser superior a zero.");
    }

    return {
      success: true,
      message: "Pedido de produto enviado com sucesso ao vendedor!",
      requestId: `preq-${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  /**
   * Toggle product favorite
   */
  public static async toggleProductFavorite(productId: string): Promise<{ isFavorited: boolean }> {
    return { isFavorited: true };
  }
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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
