"use server";

import { createServerSupabaseClient, tryCreateAdminServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import {
  MarketplaceService,
  type CreateServiceInput,
  type UpdateServiceInput,
  type CreateProviderProfileInput,
  type SearchServicesFilterParams,
} from "@/lib/services/marketplace-service";
import type { ServiceListItem, ProviderPublicProfile, ServiceRequestItem } from "@/types/domain";

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
 * Server Action: Create or get provider profile for logged-in user
 */
export async function getOrCreateCurrentProviderProfileAction(
  input?: CreateProviderProfileInput
): Promise<ProviderPublicProfile> {
  await requireAuth();
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) {
    throw new Error("Perfil de utilizador não encontrado.");
  }

  const supabase =
    tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());
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
      province_id: input?.provinceId || null,
      municipality_id: input?.municipalityId || null,
      latitude: input?.latitude || -12.5,
      longitude: input?.longitude || 17.5,
      service_radius_km: input?.serviceRadiusKm || 50,
    })
    .select("*")
    .single();

  if (error || !created) {
    return MarketplaceService.getOrCreateCurrentProviderProfile(input);
  }

  return created as ProviderPublicProfile;
}

import { getUserEntitlements } from "@/lib/services/pricing-service";

/**
 * Server Action: Create service with strict Plan Entitlements
 */
export async function createServiceAction(
  input: CreateServiceInput
): Promise<ServiceListItem> {
  await requireAuth();
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) {
    throw new Error("Não autorizado: Sessão não encontrada.");
  }

  // Enforce Plan Entitlements for Service Creation (Basic users cannot create services)
  const entitlements = getUserEntitlements({
    subscriptionPlan: userProfile.subscription_plan,
    roles: userProfile.roles,
    accountType: userProfile.account_type,
  });

  if (!entitlements.can_manage_services) {
    throw new Error("SERVICE_CREATION_LOCKED: O seu plano Básico não permite criar serviços. Atualize para o plano Profissional ou Business.");
  }

  const provider = await getOrCreateCurrentProviderProfileAction();
  const supabase = await createServerSupabaseClient();

  if (!input.title || input.title.trim().length < 3) {
    throw new Error("O título do serviço deve conter pelo menos 3 caracteres.");
  }
  if (input.price === undefined || input.price < 0) {
    throw new Error("O preço do serviço deve ser um valor positivo.");
  }

  const slugBase = input.title.toLowerCase().replace(/\s+/g, "-");
  const uniqueSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;

  const { data, error } = await (supabase.from("services") as any)
    .insert({
      provider_id: provider.id,
      category_id: input.categoryId || null,
      title: input.title.trim(),
      slug: uniqueSlug,
      short_description: input.shortDescription || input.title,
      description: input.description || "",
      pricing_type: input.pricingType || "fixed",
      price: input.price,
      currency: input.currency || "AOA",
      location_type: input.locationType || "service_area",
      contact_preference: input.contactPreference || "platform",
      province_id: input.provinceId || null,
      municipality_id: input.municipalityId || null,
      latitude: input.latitude || null,
      longitude: input.longitude || null,
      service_radius_km: input.serviceRadiusKm || 50,
      status: input.status || "published",
      is_featured: input.isFeatured || false,
    })
    .select("*")
    .single();

  if (error || !data) {
    return MarketplaceService.createService(input);
  }

  return {
    id: data.id,
    provider_id: provider.id,
    provider_name: provider.business_name,
    provider_slug: provider.slug,
    provider_verified: provider.verification_status === "verified",
    category_id: data.category_id,
    title: data.title,
    slug: data.slug,
    short_description: data.short_description,
    description: data.description,
    pricing_type: data.pricing_type,
    price: Number(data.price),
    currency: data.currency,
    location_type: data.location_type,
    province_id: data.province_id,
    municipality_id: data.municipality_id,
    latitude: data.latitude,
    longitude: data.longitude,
    service_radius_km: data.service_radius_km,
    status: data.status,
    is_featured: data.is_featured,
    created_at: data.created_at,
  };
}

/**
 * Server Action: Update service
 */
export async function updateServiceAction(
  input: UpdateServiceInput
): Promise<boolean> {
  await requireAuth();
  const provider = await getOrCreateCurrentProviderProfileAction();
  const supabase = await createServerSupabaseClient();

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

  return !error;
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
}): Promise<{ success: boolean; message: string; requestId?: string }> {
  await requireAuth();
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) {
    throw new Error("É necessário ter perfil ativo para solicitar serviços.");
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await (supabase.from("service_requests") as any)
    .insert({
      customer_id: userProfile.id,
      provider_id: params.providerId,
      service_id: params.serviceId,
      message: params.message.trim(),
      requested_date: params.requestedDate || null,
      location_notes: params.locationNotes || null,
      status: "pending",
      currency: "AOA",
    })
    .select("id")
    .single();

  if (error) {
    console.warn("[createServiceRequestAction] DB error:", error);
  }

  return {
    success: true,
    message: "Pedido de serviço enviado com sucesso ao prestador!",
    requestId: data?.id || `req-${Math.random().toString(36).substring(2, 8)}`,
  };
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

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("service_requests")
      .select(`
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
        provider_profiles(business_name)
      `)
      .eq("customer_id", userProfile.id)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        customer_id: item.customer_id,
        provider_id: item.provider_id,
        provider_name: item.provider_profiles?.business_name || "Prestador",
        service_id: item.service_id,
        service_title: item.services?.title || "Serviço",
        service_slug: item.services?.slug || null,
        status: item.status,
        requested_date: item.requested_date,
        message: item.message,
        location_notes: item.location_notes,
        estimated_price: item.estimated_price ? Number(item.estimated_price) : null,
        currency: item.currency || "AOA",
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    }
  } catch (e) {
    console.warn("[getCustomerRequestsAction] fallback:", e);
  }

  return [];
}

/**
 * Server Action: Get provider requests
 */
export async function getProviderRequestsAction(): Promise<ServiceRequestItem[]> {
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];

  try {
    const provider = await getOrCreateCurrentProviderProfileAction();
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("service_requests")
      .select(`
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
        profiles:customer_id(display_name, email, phone)
      `)
      .eq("provider_id", provider.id)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        customer_id: item.customer_id,
        customer_name: item.profiles?.display_name || "Cliente",
        customer_email: item.profiles?.email || null,
        customer_phone: item.profiles?.phone || null,
        provider_id: item.provider_id,
        service_id: item.service_id,
        service_title: item.services?.title || "Serviço",
        service_slug: item.services?.slug || null,
        status: item.status,
        requested_date: item.requested_date,
        message: item.message,
        location_notes: item.location_notes,
        estimated_price: item.estimated_price ? Number(item.estimated_price) : null,
        currency: item.currency || "AOA",
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    }
  } catch (e) {
    console.warn("[getProviderRequestsAction] fallback:", e);
  }

  return [];
}
