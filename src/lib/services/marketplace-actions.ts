"use server";

import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
  tryCreateAdminServerSupabaseClient,
} from "@/lib/supabase/server";
import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import {
  MarketplaceService,
  slugify,
  type CreateServiceInput,
  type UpdateServiceInput,
  type CreateProviderProfileInput,
  type SearchServicesFilterParams,
} from "@/lib/services/marketplace-service";
import type { ServiceListItem, ProviderPublicProfile, ServiceRequestItem } from "@/types/domain";

async function getMarketplaceWritableClient() {
  return tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function nestedRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0] && typeof value[0] === "object"
      ? (value[0] as Record<string, unknown>)
      : null;
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
}

function mapServiceRequestRow(item: Record<string, unknown>): ServiceRequestItem {
  const service = nestedRecord(item.services);
  const provider = nestedRecord(item.provider_profiles);
  const customer = nestedRecord(item.profiles);
  return {
    id: String(item.id),
    customer_id: String(item.customer_id),
    customer_name: customer?.display_name != null ? String(customer.display_name) : null,
    customer_email: customer?.email != null ? String(customer.email) : null,
    customer_phone: customer?.phone != null ? String(customer.phone) : null,
    provider_id: String(item.provider_id),
    provider_name: provider?.business_name != null ? String(provider.business_name) : null,
    service_id: item.service_id != null ? String(item.service_id) : null,
    service_title: service?.title != null ? String(service.title) : "Serviço",
    service_slug: service?.slug != null ? String(service.slug) : null,
    status: (item.status as ServiceRequestItem["status"]) || "pending",
    requested_date: item.requested_date != null ? String(item.requested_date) : null,
    message: item.message != null ? String(item.message) : null,
    location_notes: item.location_notes != null ? String(item.location_notes) : null,
    estimated_price: item.estimated_price != null ? Number(item.estimated_price) : null,
    currency: String(item.currency || "AOA"),
    created_at: String(item.created_at),
    updated_at: String(item.updated_at),
  };
}

const SERVICE_REQUEST_SELECT = `
  id,
  customer_id,
  provider_id,
  service_id,
  status,
  requested_date,
  message,
  location_notes,
  estimated_price,
  currency,
  created_at,
  updated_at,
  services(title, slug),
  provider_profiles(business_name),
  profiles:customer_id(display_name, email, phone)
`;

async function listServiceRequests(
  column: "provider_id" | "customer_id",
  value: string
): Promise<ServiceRequestItem[]> {
  const supabase = await getMarketplaceWritableClient();
  const { data, error } = await (supabase.from("service_requests") as any)
    .select(SERVICE_REQUEST_SELECT)
    .eq(column, value)
    .order("created_at", { ascending: false });

  if (!error && Array.isArray(data)) {
    return data.map((row: Record<string, unknown>) => mapServiceRequestRow(row));
  }

  const fallback = await (supabase.from("service_requests") as any)
    .select("*")
    .eq(column, value)
    .order("created_at", { ascending: false });

  if (fallback.error || !Array.isArray(fallback.data)) {
    console.warn("[listServiceRequests] query failed:", error || fallback.error);
    return [];
  }
  return fallback.data.map((row: Record<string, unknown>) => mapServiceRequestRow(row));
}

async function getExistingProviderProfile(): Promise<ProviderPublicProfile | null> {
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return null;

  const supabase = await getMarketplaceWritableClient();
  const { data, error } = await (supabase.from("provider_profiles") as any)
    .select("*")
    .eq("profile_id", userProfile.id)
    .maybeSingle();

  if (error || !data?.id) return null;

  return {
    id: data.id,
    profile_id: data.profile_id,
    business_name: data.business_name,
    slug: data.slug,
    headline: data.headline,
    description: data.description,
    provider_type: data.provider_type,
    avatar_url: userProfile.avatar_url,
    phone: data.phone,
    email: data.email,
    website: data.website,
    verification_status: data.verification_status,
    status: data.status,
    rating: Number(data.rating || 5.0),
    reviews_count: Number(data.reviews_count || 0),
    service_radius_km: Number(data.service_radius_km || 50),
    created_at: data.created_at,
  };
}

function revalidateServiceRequestPaths() {
  revalidatePath("/dashboard/requests");
}

export type CreateServiceActionResult =
  | { success: true; service: ServiceListItem }
  | { success: false; error: string };

function revalidatePublishedServicePaths(slug?: string) {
  revalidatePath("/agriservice");
  if (slug) {
    revalidatePath(`/services/${slug}`);
  }
}

function toSerializableService(
  data: Record<string, unknown>,
  provider: ProviderPublicProfile
): ServiceListItem {
  return {
    id: String(data.id),
    provider_id: String(provider.id),
    provider_name: provider.business_name,
    provider_slug: provider.slug,
    provider_verified: provider.verification_status === "verified",
    category_id: data.category_id != null ? String(data.category_id) : null,
    title: String(data.title),
    slug: String(data.slug),
    short_description: data.short_description != null ? String(data.short_description) : null,
    description: data.description != null ? String(data.description) : null,
    pricing_type: String(data.pricing_type || "fixed"),
    price: Number(data.price),
    currency: String(data.currency || "AOA"),
    location_type: String(data.location_type || "service_area"),
    province_id: data.province_id != null ? String(data.province_id) : null,
    municipality_id: data.municipality_id != null ? String(data.municipality_id) : null,
    latitude: data.latitude != null ? Number(data.latitude) : null,
    longitude: data.longitude != null ? Number(data.longitude) : null,
    service_radius_km: data.service_radius_km != null ? Number(data.service_radius_km) : null,
    status: String(data.status || "published"),
    is_featured: Boolean(data.is_featured),
    created_at: data.created_at ? String(data.created_at) : new Date().toISOString(),
  };
}

function publishFailureMessage(error: { message?: string; code?: string } | null | undefined): string {
  const msg = error?.message || "";
  if (/duplicate|unique/i.test(msg)) {
    return "Já existe um serviço com este título. Altere o título e tente novamente.";
  }
  if (msg) return `Não foi possível publicar o serviço: ${msg}`;
  return "Não foi possível publicar o serviço. Tente novamente.";
}

function missingSchemaColumn(error: { message?: string; code?: string } | null | undefined): string | null {
  const msg = error?.message || "";
  const match = msg.match(/Could not find the '([^']+)' column/i);
  if (match?.[1]) return match[1];
  if (error?.code === "PGRST204") return "__unknown__";
  return null;
}

function isPublishedStatusConstraintError(
  error: { message?: string; code?: string } | null | undefined
): boolean {
  const msg = error?.message || "";
  return /services_status_check|check constraint/i.test(msg) && /published/i.test(msg);
}

async function resolveCategoryId(
  supabase: Awaited<ReturnType<typeof getMarketplaceWritableClient>>,
  slug?: string | null
): Promise<string | null> {
  const normalized = (slug || "").trim();
  if (!normalized) return null;
  const { data } = await (supabase.from("categories") as any)
    .select("id")
    .eq("slug", normalized)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

async function resolveServiceGeography(
  supabase: Awaited<ReturnType<typeof getMarketplaceWritableClient>>,
  params: { provinceName?: string | null; municipalityName?: string | null }
): Promise<{
  province_id?: string;
  municipality_id?: string;
  latitude?: number;
  longitude?: number;
}> {
  const provinceName = (params.provinceName || "").trim();
  if (!provinceName) return {};

  const { data: province } = await (supabase.from("provinces") as any)
    .select("id, name, latitude, longitude")
    .ilike("name", provinceName)
    .maybeSingle();

  if (!province?.id) return {};

  const municipalityName = (params.municipalityName || "").trim();
  let municipalityId: string | undefined;
  if (municipalityName) {
    const { data: municipality } = await (supabase.from("municipalities") as any)
      .select("id, name")
      .eq("province_id", province.id)
      .ilike("name", municipalityName)
      .maybeSingle();
    municipalityId = municipality?.id ? String(municipality.id) : undefined;
  }

  return {
    province_id: String(province.id),
    municipality_id: municipalityId,
    latitude: province.latitude != null ? Number(province.latitude) : undefined,
    longitude: province.longitude != null ? Number(province.longitude) : undefined,
  };
}

/**
 * Server Action: Search marketplace services
 */
export async function searchServicesAction(
  params: SearchServicesFilterParams = {}
): Promise<{ services: ServiceListItem[]; total: number }> {
  return MarketplaceService.searchServices(params);
}

/**
 * Server Action: Get service by slug
 */
export async function getServiceBySlugAction(
  slug: string
): Promise<ServiceListItem | null> {
  return MarketplaceService.getServiceBySlug(slug);
}

/**
 * Server Action: Get provider by slug
 */
export async function getProviderBySlugAction(
  slug: string
): Promise<ProviderPublicProfile | null> {
  return MarketplaceService.getProviderBySlug(slug);
}

/**
 * Server Action: Get services by provider id
 */
export async function getProviderServicesAction(
  providerId: string,
  onlyPublished = true
): Promise<ServiceListItem[]> {
  return MarketplaceService.getProviderServices(providerId, onlyPublished);
}

/**
 * Server Action: List services owned by the authenticated provider
 */
export async function listMyServicesAction(): Promise<ServiceListItem[]> {
  await requireAuth();
  const provider = await ensureCurrentProviderProfile();
  return MarketplaceService.getProviderServices(provider.id, false);
}

async function ensureCurrentProviderProfile(
  input?: CreateProviderProfileInput
): Promise<ProviderPublicProfile> {
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) {
    throw new Error("Perfil de utilizador não encontrado.");
  }

  const supabase = await getMarketplaceWritableClient();
  const { data: existing } = await (supabase.from("provider_profiles") as any)
    .select("*")
    .eq("profile_id", userProfile.id)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      profile_id: existing.profile_id,
      business_name: existing.business_name,
      slug: existing.slug,
      headline: existing.headline,
      description: existing.description,
      provider_type: existing.provider_type,
      avatar_url: userProfile.avatar_url,
      phone: existing.phone,
      email: existing.email,
      website: existing.website,
      verification_status: existing.verification_status,
      status: existing.status,
      rating: Number(existing.rating || 5.0),
      reviews_count: Number(existing.reviews_count || 0),
      service_radius_km: Number(existing.service_radius_km || 50),
      created_at: existing.created_at,
    };
  }

  const businessName = input?.businessName || userProfile.display_name || "Meu Negócio Agrícola";
  const slugBase = input?.businessName ? input.businessName.toLowerCase().replace(/\s+/g, "-") : `prestador-${userProfile.id.slice(-6)}`;
  const uniqueSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;

  const { data: created, error } = await (supabase.from("provider_profiles") as any)
    .insert({
      profile_id: userProfile.id,
      business_name: businessName,
      slug: uniqueSlug,
      headline: input?.headline || "Prestador de Serviços Agropecuários",
      description: input?.description || "Serviços especializados para o agronegócio em Angola.",
      provider_type: input?.providerType || "individual",
      phone: input?.phone || userProfile.phone,
      email: input?.email || userProfile.email,
      website: input?.website || null,
      verification_status: "unverified",
      status: "active",
      publication_state: "draft",
      avatar_url: userProfile.avatar_url,
      province_id: input?.provinceId || null,
      municipality_id: input?.municipalityId || null,
      latitude: input?.latitude || -12.5,
      longitude: input?.longitude || 17.5,
      service_radius_km: input?.serviceRadiusKm || 50,
    })
    .select("*")
    .single();

  if (error || !created) {
    if (isSupabaseConfigured()) {
      throw new Error(
        error?.message
          ? `Não foi possível criar o perfil de prestador: ${error.message}`
          : "Não foi possível criar o perfil de prestador. Tente novamente."
      );
    }
    return MarketplaceService.getOrCreateCurrentProviderProfile(input);
  }

  return created as ProviderPublicProfile;
}

/**
 * Server Action: Create or get provider profile for logged-in user
 */
export async function getOrCreateCurrentProviderProfileAction(
  input?: CreateProviderProfileInput
): Promise<ProviderPublicProfile> {
  await requireAuth();
  return ensureCurrentProviderProfile(input);
}

/**
 * Server Action: Create service with strict Plan Entitlements
 */
export async function createServiceAction(
  input: CreateServiceInput
): Promise<CreateServiceActionResult> {
  try {
    await requireAuth();
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) {
      return { success: false, error: "Não autorizado: Sessão não encontrada." };
    }

    const entitlements = getUserEntitlements({
      subscriptionPlan: userProfile.subscription_plan,
      roles: userProfile.roles,
      accountType: userProfile.account_type,
    });

    if (!entitlements.can_manage_services) {
      return {
        success: false,
        error:
          "SERVICE_CREATION_LOCKED: O seu plano não permite criar serviços. Atualize para o plano Profissional ou Business.",
      };
    }

    if (!input.title || input.title.trim().length < 3) {
      return { success: false, error: "O título do serviço deve conter pelo menos 3 caracteres." };
    }
    if (input.price === undefined || input.price < 0) {
      return { success: false, error: "O preço do serviço deve ser um valor positivo." };
    }

    const provider = await ensureCurrentProviderProfile();
    const supabase = await getMarketplaceWritableClient();

    const slugBase = slugify(input.title) || "servico";
    const uniqueSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;
    const categoryId =
      input.categoryId || (await resolveCategoryId(supabase, input.categorySlug));
    const geography = await resolveServiceGeography(supabase, {
      provinceName: input.provinceName,
      municipalityName: input.municipalityName,
    });

    const insertService = (row: Record<string, unknown>) =>
      (supabase.from("services") as any).insert(row).select("*").single();

    // Older live `services` tables omit later marketplace columns. PostgREST
    // rejects unknown fields (PGRST204), so the payload stays on core columns
    // and retries without any field missing from the schema cache.
    const serviceRow: Record<string, unknown> = {
      provider_id: provider.id,
      category_id: categoryId,
      title: input.title.trim(),
      slug: uniqueSlug,
      short_description: input.shortDescription || input.title,
      description: input.description || "",
      pricing_type: input.pricingType || "fixed",
      price: input.price,
      currency: input.currency || "AOA",
      location_type: input.locationType || "service_area",
      province_id: input.provinceId || geography.province_id || null,
      municipality_id: input.municipalityId || geography.municipality_id || null,
      latitude: input.latitude ?? geography.latitude ?? null,
      longitude: input.longitude ?? geography.longitude ?? null,
      service_radius_km: input.serviceRadiusKm || 50,
      status: input.status || "published",
      is_featured: input.isFeatured || false,
    };

    let { data, error } = await insertService(serviceRow);

    while (error && missingSchemaColumn(error)) {
      const column = missingSchemaColumn(error);
      if (!column || column === "__unknown__" || !(column in serviceRow)) break;
      delete serviceRow[column];
      ({ data, error } = await insertService(serviceRow));
    }

    if (error && isPublishedStatusConstraintError(error) && serviceRow.status === "published") {
      serviceRow.status = "active";
      ({ data, error } = await insertService(serviceRow));
    }

    if (error || !data) {
      console.warn("[createServiceAction] DB error:", error);
      if (!isSupabaseConfigured()) {
        return {
          success: true,
          service: await MarketplaceService.createService(input),
        };
      }
      return { success: false, error: publishFailureMessage(error) };
    }

    revalidatePublishedServicePaths(String(data.slug));

    return {
      success: true,
      service: toSerializableService(data as Record<string, unknown>, provider),
    };
  } catch (error) {
    console.warn("[createServiceAction] failed:", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Não foi possível publicar o serviço. Tente novamente.";
    if (/minified react error|#441|server components render/i.test(message)) {
      return { success: false, error: "Não foi possível publicar o serviço. Tente novamente." };
    }
    return { success: false, error: message };
  }
}

/**
 * Server Action: Update service
 */
export async function updateServiceAction(
  input: UpdateServiceInput
): Promise<boolean> {
  await requireAuth();
  const provider = await ensureCurrentProviderProfile();
  const supabase = await getMarketplaceWritableClient();

  const updates: Record<string, any> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.shortDescription !== undefined) updates.short_description = input.shortDescription;
  if (input.description !== undefined) updates.description = input.description;
  if (input.pricingType !== undefined) updates.pricing_type = input.pricingType;
  if (input.price !== undefined) updates.price = input.price;
  if (input.status !== undefined) updates.status = input.status;
  if (input.serviceRadiusKm !== undefined) updates.service_radius_km = input.serviceRadiusKm;
  if (input.provinceId !== undefined) updates.province_id = input.provinceId;
  if (input.municipalityId !== undefined) updates.municipality_id = input.municipalityId;
  if (input.latitude !== undefined) updates.latitude = input.latitude;
  if (input.longitude !== undefined) updates.longitude = input.longitude;

  const { error } = await (supabase.from("services") as any)
    .update(updates)
    .eq("id", input.id)
    .eq("provider_id", provider.id);

  if (error) return false;
  revalidatePublishedServicePaths();
  revalidatePath("/dashboard/services");
  return true;
}

/**
 * Server Action: Create service request
 */
export async function createServiceRequestAction(params: {
  serviceId: string;
  providerId: string;
  message: string;
  requestedDate?: string;
  locationNotes?: string;
}): Promise<{ success: boolean; message: string; requestId?: string; error?: string }> {
  try {
    await requireAuth();
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) {
      return {
        success: false,
        message: "É necessário ter perfil ativo para solicitar serviços.",
        error: "É necessário ter perfil ativo para solicitar serviços.",
      };
    }

    const message = (params.message || "").trim();
    if (!message) {
      return {
        success: false,
        message: "Descreva o que necessita para este serviço.",
        error: "Descreva o que necessita para este serviço.",
      };
    }
    if (!looksLikeUuid(params.serviceId) || !looksLikeUuid(params.providerId)) {
      return {
        success: false,
        message: "Serviço inválido. Atualize a página e tente novamente.",
        error: "Serviço inválido. Atualize a página e tente novamente.",
      };
    }

    const supabase = await getMarketplaceWritableClient();
    const { data: service, error: serviceError } = await (supabase.from("services") as any)
      .select("id, provider_id")
      .eq("id", params.serviceId)
      .maybeSingle();

    if (serviceError || !service?.id) {
      return {
        success: false,
        message: "Serviço não encontrado.",
        error: "Serviço não encontrado.",
      };
    }

    const providerId = String(service.provider_id);
    if (providerId !== params.providerId) {
      return {
        success: false,
        message: "Prestador inválido para este serviço.",
        error: "Prestador inválido para este serviço.",
      };
    }

    const { data, error } = await (supabase.from("service_requests") as any)
      .insert({
        customer_id: userProfile.id,
        provider_id: providerId,
        service_id: service.id,
        message,
        requested_date: params.requestedDate || null,
        location_notes: params.locationNotes || null,
        status: "pending",
        currency: "AOA",
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      console.warn("[createServiceRequestAction] DB error:", error);
      if (!isSupabaseConfigured()) {
        return {
          success: true,
          message: "Pedido de serviço enviado com sucesso ao prestador!",
          requestId: `req-${Math.random().toString(36).substring(2, 8)}`,
        };
      }
      return {
        success: false,
        message: "Não foi possível enviar o pedido. Tente novamente.",
        error: error?.message
          ? `Não foi possível enviar o pedido: ${error.message}`
          : "Não foi possível enviar o pedido. Tente novamente.",
      };
    }

    revalidateServiceRequestPaths();
    return {
      success: true,
      message: "Pedido de serviço enviado com sucesso ao prestador!",
      requestId: String(data.id),
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Não foi possível enviar o pedido. Tente novamente.";
    return { success: false, message, error: message };
  }
}

/**
 * Server Action: Toggle favorite
 */
export async function toggleFavoriteAction(
  serviceId: string
): Promise<{ isFavorited: boolean }> {
  await requireAuth();
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) throw new Error("Não autorizado");

  const supabase = await createServerSupabaseClient();

  const { data: existing } = await (supabase.from("favorites") as any)
    .select("id")
    .eq("profile_id", userProfile.id)
    .eq("entity_type", "service")
    .eq("entity_id", serviceId)
    .single();

  if (existing) {
    await (supabase.from("favorites") as any).delete().eq("id", existing.id);
    return { isFavorited: false };
  } else {
    await (supabase.from("favorites") as any).insert({
      profile_id: userProfile.id,
      entity_type: "service",
      entity_id: serviceId,
    });
    return { isFavorited: true };
  }
}

/**
 * Server Action: Get customer requests
 */
export async function getCustomerRequestsAction(): Promise<ServiceRequestItem[]> {
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];
  return listServiceRequests("customer_id", userProfile.id);
}

/**
 * Server Action: Get provider incoming requests
 */
export async function getProviderRequestsAction(): Promise<ServiceRequestItem[]> {
  await requireAuth();
  const provider = await getExistingProviderProfile();
  if (!provider) return [];
  return listServiceRequests("provider_id", provider.id);
}

/**
 * Server Action: Provider accepts or rejects an incoming service request
 */
export async function updateServiceRequestStatusAction(input: {
  id: string;
  status: "accepted" | "rejected";
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth();
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) {
      return { success: false, error: "Não autorizado: Sessão não encontrada." };
    }

    const entitlements = getUserEntitlements({
      subscriptionPlan: userProfile.subscription_plan,
      roles: userProfile.roles,
      accountType: userProfile.account_type,
    });
    if (!entitlements.can_manage_services) {
      return {
        success: false,
        error: "O seu plano não permite gerir pedidos de serviço.",
      };
    }

    if (!looksLikeUuid(input.id)) {
      return { success: false, error: "Pedido inválido." };
    }

    const provider = await getExistingProviderProfile();
    if (!provider) {
      return { success: false, error: "Perfil de prestador não encontrado." };
    }

    const supabase = await getMarketplaceWritableClient();
    const { data, error } = await (supabase.from("service_requests") as any)
      .update({ status: input.status })
      .eq("id", input.id)
      .eq("provider_id", provider.id)
      .select("id")
      .maybeSingle();

    if (error || !data?.id) {
      return { success: false, error: "Pedido não encontrado ou sem permissão." };
    }

    revalidateServiceRequestPaths();
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Não foi possível atualizar o pedido.";
    return { success: false, error: message };
  }
}
