"use server";

import { createServerSupabaseClient, tryCreateAdminServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { getOrCreateCurrentProviderProfileAction } from "@/lib/services/marketplace-actions";
import { NotificationService } from "@/lib/services/notification-service";
import {
  TransportService,
  type CreateTransportInput,
  type SearchTransportFilterParams,
  type UpdateTransportInput,
} from "@/lib/transport/transport-service";
import type { TransportListItem, TransportRequestItem, TransportRequestStatus } from "@/types/transport";

export async function searchPublishedTransportsAction(
  params: SearchTransportFilterParams = {}
): Promise<{ transports: TransportListItem[]; total: number }> {
  return TransportService.searchPublishedTransports(params);
}

export async function getTransportBySlugAction(slug: string): Promise<TransportListItem | null> {
  return TransportService.getTransportBySlug(slug);
}

export async function getProviderTransportsAction(
  providerId: string,
  onlyPublished = true
): Promise<TransportListItem[]> {
  return TransportService.getProviderTransports(providerId, onlyPublished);
}

export async function getOwnedTransportsAction(): Promise<TransportListItem[]> {
  await requireAuth();
  const provider = await getOrCreateCurrentProviderProfileAction();
  return TransportService.getOwnedTransports(provider.id);
}

export async function createTransportAction(
  input: CreateTransportInput
): Promise<{ success: boolean; transport?: TransportListItem; error?: string }> {
  try {
    await requireAuth();
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) {
      return { success: false, error: "Sessão não encontrada." };
    }

    const entitlements = getUserEntitlements({
      subscriptionPlan: userProfile.subscription_plan,
      roles: userProfile.roles,
      accountType: userProfile.account_type,
    });

    if (!entitlements.can_manage_services) {
      return {
        success: false,
        error: "O seu plano não permite publicar transportes. Atualize para Pro, Business ou Enterprise.",
      };
    }

    if (!input.title?.trim() || input.title.trim().length < 3) {
      return { success: false, error: "O título deve ter pelo menos 3 caracteres." };
    }
    if (!input.vehicleName?.trim()) {
      return { success: false, error: "Indique o veículo." };
    }

    const provider = await getOrCreateCurrentProviderProfileAction();
    const supabase = await createServerSupabaseClient();
    const slug = TransportService.buildSlug(input.title);

    const { data, error } = await (supabase.from("transport_services") as any)
      .insert({
        provider_id: provider.id,
        title: input.title.trim(),
        slug,
        short_description: input.shortDescription || input.title,
        description: input.description || "",
        origin_label: input.originLabel || null,
        destination_label: input.destinationLabel || null,
        origin_province_id: input.originProvinceId || null,
        origin_municipality_id: input.originMunicipalityId || null,
        destination_province_id: input.destinationProvinceId || null,
        destination_municipality_id: input.destinationMunicipalityId || null,
        vehicle_name: input.vehicleName.trim(),
        vehicle_type: input.vehicleType || null,
        vehicle_model: input.vehicleModel || null,
        capacity_load: input.capacityLoad || null,
        vehicle_media_url: input.vehicleMediaUrl || null,
        base_province_id: input.baseProvinceId || null,
        base_municipality_id: input.baseMunicipalityId || null,
        base_latitude: input.baseLatitude || null,
        base_longitude: input.baseLongitude || null,
        price_per_trip: input.pricePerTrip ?? 0,
        price_per_load: input.pricePerLoad ?? 0,
        currency: input.currency || "AOA",
        status: input.status || "draft",
      })
      .select("*")
      .single();

    if (error || !data) {
      console.warn("[createTransportAction] DB error:", error);
      return { success: false, error: "Não foi possível criar o transporte." };
    }

    const transports = await TransportService.getOwnedTransports(provider.id);
    const created = transports.find((t) => t.id === data.id);
    return { success: true, transport: created };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao criar transporte.";
    return { success: false, error: message };
  }
}

export async function updateTransportStatusAction(
  transportId: string,
  status: "draft" | "published" | "paused" | "archived"
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth();
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return { success: false, error: "Sessão não encontrada." };

    const entitlements = getUserEntitlements({
      subscriptionPlan: userProfile.subscription_plan,
      roles: userProfile.roles,
      accountType: userProfile.account_type,
    });

    if (!entitlements.can_manage_services) {
      return { success: false, error: "O seu plano não permite gerir transportes." };
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await (supabase.from("transport_services") as any)
      .update({ status })
      .eq("id", transportId);

    if (error) {
      return { success: false, error: "Não foi possível atualizar o estado." };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na atualização.";
    return { success: false, error: message };
  }
}

export async function createTransportRequestAction(params: {
  transportServiceId: string;
  providerId: string;
  message: string;
  originNotes?: string;
  destinationNotes?: string;
  requestedDate?: string;
}): Promise<{ success: boolean; message: string; requestId?: string }> {
  await requireAuth();
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) {
    throw new Error("É necessário ter perfil ativo para solicitar transporte.");
  }

  const transport = await TransportService.getTransportBySlug(
    (await getTransportById(params.transportServiceId))?.slug || ""
  );

  const supabase = await createServerSupabaseClient();
  const { data, error } = await (supabase.from("transport_requests") as any)
    .insert({
      customer_id: userProfile.id,
      provider_id: params.providerId,
      transport_service_id: params.transportServiceId,
      message: params.message.trim(),
      origin_notes: params.originNotes || null,
      destination_notes: params.destinationNotes || null,
      requested_date: params.requestedDate || null,
      estimated_trip_price: transport?.price_per_trip ?? null,
      estimated_load_price: transport?.price_per_load ?? null,
      status: "pending",
      currency: "AOA",
    })
    .select("id")
    .single();

  if (error) {
    console.warn("[createTransportRequestAction] DB error:", error);
  }

  const requestId = data?.id || `trq-${Math.random().toString(36).substring(2, 8)}`;

  const admin = tryCreateAdminServerSupabaseClient();
  if (admin) {
    const { data: providerRow } = await (admin.from("provider_profiles") as any)
      .select("profile_id")
      .eq("id", params.providerId)
      .maybeSingle();

    if (providerRow?.profile_id) {
      await NotificationService.createNotification({
        profileId: providerRow.profile_id,
        type: "transport.request",
        title: "Novo pedido de transporte",
        message: `Recebeu um novo pedido de transporte${transport ? ` para "${transport.title}"` : ""}.`,
        linkUrl: "/dashboard/transport/requests",
        data: { requestId, transportServiceId: params.transportServiceId },
      });
    }
  }

  return {
    success: true,
    message: "Pedido de transporte enviado com sucesso ao transportador!",
    requestId,
  };
}

async function getTransportById(id: string): Promise<TransportListItem | null> {
  const published = await TransportService.searchPublishedTransports({ limit: 200 });
  const match = published.transports.find((t) => t.id === id);
  if (match) return match;
  const { INITIAL_TRANSPORT_SERVICES } = await import("@/lib/transport/transport-service");
  return INITIAL_TRANSPORT_SERVICES.find((t) => t.id === id) || null;
}

export async function getTransportRequestsForProviderAction(): Promise<TransportRequestItem[]> {
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];

  const provider = await getOrCreateCurrentProviderProfileAction();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await (supabase.from("transport_requests") as any)
    .select(
      `
      *,
      profiles:customer_id(display_name),
      provider_profiles(provider_id:business_name),
      transport_services(title, slug)
    `
    )
    .eq("provider_id", provider.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => TransportService.mapRequestRow(row));
}

export async function getCustomerTransportRequestsAction(): Promise<TransportRequestItem[]> {
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];

  const supabase = await createServerSupabaseClient();
  const { data, error } = await (supabase.from("transport_requests") as any)
    .select(
      `
      *,
      profiles:customer_id(display_name),
      provider_profiles(business_name),
      transport_services(title, slug)
    `
    )
    .eq("customer_id", userProfile.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => TransportService.mapRequestRow(row));
}

export async function updateTransportRequestStatusAction(params: {
  requestId: string;
  status: TransportRequestStatus;
}): Promise<{ success: boolean; message: string }> {
  await requireAuth();
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) {
    return { success: false, message: "Sessão não encontrada." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing, error: fetchError } = await (supabase.from("transport_requests") as any)
    .select("id, customer_id, provider_id, status, transport_services(title)")
    .eq("id", params.requestId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { success: false, message: "Pedido não encontrado." };
  }

  const provider = await getOrCreateCurrentProviderProfileAction();
  const isProvider = existing.provider_id === provider.id;
  const isCustomer = existing.customer_id === userProfile.id;

  if (!isProvider && !isCustomer) {
    return { success: false, message: "Não autorizado." };
  }

  if (isCustomer && params.status !== "cancelled") {
    return { success: false, message: "Apenas pode cancelar o seu pedido." };
  }

  if (isProvider && !["accepted", "rejected"].includes(params.status)) {
    return { success: false, message: "Ação inválida para o transportador." };
  }

  const { error } = await (supabase.from("transport_requests") as any)
    .update({ status: params.status })
    .eq("id", params.requestId);

  if (error) {
    return { success: false, message: "Não foi possível atualizar o pedido." };
  }

  const notifyProfileId = isProvider ? existing.customer_id : null;
  if (notifyProfileId) {
    const statusLabel =
      params.status === "accepted"
        ? "aceite"
        : params.status === "rejected"
          ? "rejeitado"
          : "cancelado";

    await NotificationService.createNotification({
      profileId: notifyProfileId,
      type: "transport.request_update",
      title: `Pedido de transporte ${statusLabel}`,
      message: `O seu pedido de transporte foi ${statusLabel} pelo transportador.`,
      linkUrl: "/dashboard/transport/requests",
      data: { requestId: params.requestId, status: params.status },
    });
  }

  return { success: true, message: "Estado do pedido atualizado." };
}
