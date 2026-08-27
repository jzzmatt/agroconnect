"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, isSupabaseConfigured, tryCreateAdminServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { getOrCreateCurrentProviderProfileAction } from "@/lib/services/marketplace-actions";
import { NotificationService } from "@/lib/services/notification-service";
import { getTransportWritableClient } from "@/lib/transport/supabase-client";
import { requireTransportOwnership } from "@/lib/transport/ownership";
import {
  assertTransportStatusTransition,
} from "@/lib/transport/transport-lifecycle";
import {
  buildTransportRequestInsert,
  canActorChangeTransportRequestStatus,
  isTransportServiceId,
  requirePersistedRequestId,
  resolveTransportRequestActor,
} from "@/lib/transport/transport-request-lifecycle";
import { canPermanentlyDeleteTransport } from "@/lib/transport/transport-delete-flow";
import { validateTransportForPublication } from "@/lib/transport/transport-publication-validation";
import type { TransportListItem, TransportPublicationStatus, TransportRequestItem, TransportRequestStatus } from "@/types/transport";
import {
  TransportService,
  type CreateTransportInput,
  type SearchTransportFilterParams,
  type UpdateTransportInput,
} from "@/lib/transport/transport-service";

export type TransportMutationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

function revalidateTransportPaths(slug?: string) {
  revalidatePath("/dashboard/transport");
  revalidatePath("/dashboard/transport/requests");
  revalidatePath("/dashboard/transport/requests/receiving");
  revalidatePath("/dashboard/transport/requests/sending");
  if (slug) {
    revalidatePath(`/transport/${slug}`);
    revalidatePath("/agriservice");
  }
}

const TRANSPORT_REQUEST_SELECT = `
  *,
  profiles:customer_id(display_name),
  provider_profiles!transport_requests_provider_id_fkey(business_name),
  transport_services!transport_requests_transport_service_id_fkey(
    title,
    slug,
    origin_label,
    destination_label,
    vehicle_name,
    vehicle_type,
    vehicle_model,
    capacity_load
  )
`;

async function getCurrentProviderId(profileId: string): Promise<string | null> {
  const supabase = tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());
  const { data, error } = await (supabase.from("provider_profiles") as any)
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error || !data?.id) return null;
  return String(data.id);
}

async function listTransportRequests(
  column: "provider_id" | "customer_id",
  value: string
): Promise<TransportRequestItem[]> {
  const supabase = await createServerSupabaseClient();
  const query = (supabase.from("transport_requests") as any)
    .select(TRANSPORT_REQUEST_SELECT)
    .eq(column, value)
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (!error && data) {
    return data.map((row: Record<string, unknown>) => TransportService.mapRequestRow(row));
  }

  console.warn("[listTransportRequests] embed query failed, retrying without joins:", error);
  const fallback = await (supabase.from("transport_requests") as any)
    .select("*")
    .eq(column, value)
    .order("created_at", { ascending: false });

  if (fallback.error || !fallback.data) return [];
  return fallback.data.map((row: Record<string, unknown>) => TransportService.mapRequestRow(row));
}

async function notifyTransportRequest(params: {
  profileId: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string;
  data?: Record<string, unknown>;
}) {
  try {
    await NotificationService.createNotification(params);
  } catch (error) {
    console.warn("[notifyTransportRequest] notification failed:", error);
  }
}

async function requireTransportManager() {
  await requireAuth();
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) {
    throw new Error("Sessão não encontrada.");
  }
  const entitlements = getUserEntitlements({
    subscriptionPlan: userProfile.subscription_plan,
    roles: userProfile.roles,
    accountType: userProfile.account_type,
  });
  if (!entitlements.can_manage_services) {
    throw new Error("O seu plano não permite gerir transportes.");
  }
  const provider = await getOrCreateCurrentProviderProfileAction();
  return { userProfile, provider };
}

async function loadOwnedTransport(transportId: string): Promise<TransportListItem | null> {
  const { provider } = await requireTransportManager();
  return TransportService.getOwnedTransportById(provider.id, transportId);
}

async function transitionTransportStatus(
  transportId: string,
  nextStatus: TransportPublicationStatus,
  options?: { skipPublicationValidation?: boolean }
): Promise<TransportMutationResult<TransportListItem>> {
  try {
    const { userProfile, provider } = await requireTransportManager();
    const current = await TransportService.getOwnedTransportById(provider.id, transportId);
    if (!current) {
      return { success: false, error: "Transporte não encontrado.", code: "TRANSPORT_NOT_FOUND" };
    }

    assertTransportStatusTransition(current.status, nextStatus);

    if (nextStatus === "published" && !options?.skipPublicationValidation) {
      const validation = validateTransportForPublication(current);
      if (!validation.ok) {
        return { success: false, error: validation.errors.join(" "), code: "VALIDATION_ERROR" };
      }
    }

    await requireTransportOwnership(transportId, userProfile);

    const supabase = await getTransportWritableClient();
    const { data, error } = await (supabase.from("transport_services") as any)
      .update({ status: nextStatus })
      .eq("id", transportId)
      .eq("provider_id", provider.id)
      .select(TRANSPORT_INSERT_SELECT)
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: "Não foi possível atualizar o estado.", code: "DATABASE_ERROR" };
    }

    const updated = TransportService.mapTransportRow(data as Record<string, unknown>);
    revalidateTransportPaths(updated.slug);
    return { success: true, data: updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na atualização.";
    return { success: false, error: message };
  }
}

const TRANSPORT_INSERT_SELECT = `
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
  provider_profiles(id, business_name, slug, verification_status)
`;

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
    const supabase = await getTransportWritableClient();
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
        vehicle_video_url: input.vehicleVideoUrl || null,
        base_province_id: input.baseProvinceId || null,
        base_municipality_id: input.baseMunicipalityId || null,
        base_latitude: input.baseLatitude || null,
        base_longitude: input.baseLongitude || null,
        price_per_trip: input.pricePerTrip ?? 0,
        price_per_load: input.pricePerLoad ?? 0,
        currency: input.currency || "AOA",
        status: input.status || "draft",
      })
      .select(TRANSPORT_INSERT_SELECT)
      .single();

    if (error || !data) {
      console.warn("[createTransportAction] DB error:", error);
      const message = error?.message || "Não foi possível criar o transporte.";
      return { success: false, error: message };
    }

    const updated = TransportService.mapTransportRow(data as Record<string, unknown>);
    revalidateTransportPaths(updated.slug);
    return {
      success: true,
      transport: updated,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao criar transporte.";
    return { success: false, error: message };
  }
}

export async function getOwnedTransportByIdAction(
  transportId: string
): Promise<TransportListItem | null> {
  try {
    await requireTransportManager();
    return loadOwnedTransport(transportId);
  } catch {
    return null;
  }
}

export async function getTransportCreatorDashboardAction(): Promise<{
  draftTransports: TransportListItem[];
  publishedTransports: TransportListItem[];
  pausedTransports: TransportListItem[];
  archivedTransports: TransportListItem[];
}> {
  const transports = await getOwnedTransportsAction();
  return {
    draftTransports: transports.filter((t) => t.status === "draft"),
    publishedTransports: transports.filter((t) => t.status === "published"),
    pausedTransports: transports.filter((t) => t.status === "paused"),
    archivedTransports: transports.filter((t) => t.status === "archived"),
  };
}

export async function updateTransportAction(
  input: UpdateTransportInput
): Promise<TransportMutationResult<TransportListItem>> {
  try {
    const { userProfile, provider } = await requireTransportManager();
    const current = await TransportService.getOwnedTransportById(provider.id, input.id);
    if (!current) {
      return { success: false, error: "Transporte não encontrado.", code: "TRANSPORT_NOT_FOUND" };
    }

    await requireTransportOwnership(input.id, userProfile);

    const supabase = await getTransportWritableClient();
    const { data, error } = await (supabase.from("transport_services") as any)
      .update({
        title: input.title?.trim() || current.title,
        short_description: input.shortDescription || input.title || current.title,
        description: input.description ?? current.description,
        origin_label: input.originLabel ?? current.origin_label,
        destination_label: input.destinationLabel ?? current.destination_label,
        vehicle_name: input.vehicleName?.trim() || current.vehicle_name,
        vehicle_type: input.vehicleType ?? current.vehicle_type,
        vehicle_model: input.vehicleModel ?? current.vehicle_model,
        capacity_load: input.capacityLoad ?? current.capacity_load,
        price_per_trip: input.pricePerTrip ?? current.price_per_trip,
        price_per_load: input.pricePerLoad ?? current.price_per_load,
        currency: input.currency || current.currency,
      })
      .eq("id", input.id)
      .eq("provider_id", provider.id)
      .select(TRANSPORT_INSERT_SELECT)
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: "Não foi possível guardar o transporte.", code: "DATABASE_ERROR" };
    }

    const updated = TransportService.mapTransportRow(data as Record<string, unknown>);
    revalidateTransportPaths(updated.slug);
    return { success: true, data: updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao guardar.";
    return { success: false, error: message };
  }
}

export async function publishTransportAction(
  transportId: string
): Promise<TransportMutationResult<TransportListItem>> {
  return transitionTransportStatus(transportId, "published");
}

export async function pauseTransportAction(
  transportId: string
): Promise<TransportMutationResult<TransportListItem>> {
  return transitionTransportStatus(transportId, "paused");
}

export async function resumeTransportAction(
  transportId: string
): Promise<TransportMutationResult<TransportListItem>> {
  return transitionTransportStatus(transportId, "published");
}

export async function draftTransportAction(
  transportId: string
): Promise<TransportMutationResult<TransportListItem>> {
  return transitionTransportStatus(transportId, "draft", { skipPublicationValidation: true });
}

export async function archiveTransportAction(
  transportId: string
): Promise<TransportMutationResult<TransportListItem>> {
  return transitionTransportStatus(transportId, "archived", { skipPublicationValidation: true });
}

export async function deleteTransportAction(
  transportId: string
): Promise<TransportMutationResult<{ id: string }>> {
  try {
    const { userProfile, provider } = await requireTransportManager();
    const current = await TransportService.getOwnedTransportById(provider.id, transportId);
    if (!current) {
      return { success: false, error: "Transporte não encontrado.", code: "TRANSPORT_NOT_FOUND" };
    }
    if (!canPermanentlyDeleteTransport(current.status)) {
      return {
        success: false,
        error: "Pause a publicação antes de eliminar este transporte.",
        code: "TRANSPORT_PUBLISHED",
      };
    }

    await requireTransportOwnership(transportId, userProfile);

    const supabase = await getTransportWritableClient();
    const { error } = await (supabase.from("transport_services") as any)
      .delete()
      .eq("id", transportId)
      .eq("provider_id", provider.id);

    if (error) {
      return { success: false, error: "Não foi possível eliminar o transporte.", code: "DATABASE_ERROR" };
    }

    revalidateTransportPaths(current.slug);
    return { success: true, data: { id: transportId } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao eliminar.";
    return { success: false, error: message };
  }
}

export async function updateTransportStatusAction(
  transportId: string,
  status: TransportPublicationStatus
): Promise<{ success: boolean; error?: string }> {
  const result = await transitionTransportStatus(transportId, status, {
    skipPublicationValidation: status !== "published",
  });
  return result.success ? { success: true } : { success: false, error: result.error };
}

export async function createTransportRequestAction(params: {
  transportServiceId: string;
  message: string;
  originNotes?: string;
  destinationNotes?: string;
  requestedDate?: string;
}): Promise<{ success: boolean; message: string; requestId?: string }> {
  await requireAuth();
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) {
    return { success: false, message: "É necessário ter perfil ativo para solicitar transporte." };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, message: "O pedido não pôde ser gravado. Tente novamente." };
  }

  if (!isTransportServiceId(params.transportServiceId)) {
    return { success: false, message: "Serviço de transporte inválido." };
  }

  const message = params.message.trim();
  if (!message) {
    return { success: false, message: "Descreva o que pretende transportar." };
  }

  let requestedDate: string | null = null;
  if (params.requestedDate?.trim()) {
    const parsed = new Date(params.requestedDate);
    if (Number.isNaN(parsed.getTime())) {
      return { success: false, message: "Data pedida inválida." };
    }
    requestedDate = parsed.toISOString();
  }

  const transport = await TransportService.getPublishedTransportById(params.transportServiceId);
  if (!transport) {
    return { success: false, message: "O serviço de transporte publicado não foi encontrado." };
  }

  const actorProviderId = await getCurrentProviderId(userProfile.id);
  if (actorProviderId && actorProviderId === transport.provider_id) {
    return { success: false, message: "Não pode solicitar o seu próprio transporte." };
  }

  const insert = buildTransportRequestInsert({
    customerId: userProfile.id,
    transport,
    message,
    originNotes: params.originNotes,
    destinationNotes: params.destinationNotes,
    requestedDate,
  });

  const supabase = await createServerSupabaseClient();
  const { data, error } = await (supabase.from("transport_requests") as any)
    .insert(insert)
    .select("id")
    .single();

  const persisted = requirePersistedRequestId(data, error);
  if (!persisted.ok) {
    console.warn("[createTransportRequestAction] DB error:", error);
    return { success: false, message: persisted.error };
  }

  revalidateTransportPaths(transport.slug);

  const admin = tryCreateAdminServerSupabaseClient();
  if (admin) {
    const { data: providerRow } = await (admin.from("provider_profiles") as any)
      .select("profile_id")
      .eq("id", transport.provider_id)
      .maybeSingle();

    if (providerRow?.profile_id) {
      await notifyTransportRequest({
        profileId: providerRow.profile_id,
        type: "transport.request",
        title: "Novo pedido de transporte",
        message: `Recebeu um novo pedido de transporte para "${transport.title}".`,
        linkUrl: "/dashboard/transport/requests/receiving",
        data: { requestId: persisted.requestId, transportServiceId: transport.id },
      });
    }
  }

  return {
    success: true,
    message: "Pedido de transporte enviado com sucesso ao transportador!",
    requestId: persisted.requestId,
  };
}

export async function getTransportRequestsForProviderAction(): Promise<TransportRequestItem[]> {
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];

  const providerId = await getCurrentProviderId(userProfile.id);
  if (!providerId) return [];

  return listTransportRequests("provider_id", providerId);
}

export async function getCustomerTransportRequestsAction(): Promise<TransportRequestItem[]> {
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];

  return listTransportRequests("customer_id", userProfile.id);
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

  if (!isTransportServiceId(params.requestId)) {
    return { success: false, message: "Pedido não encontrado." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing, error: fetchError } = await (supabase.from("transport_requests") as any)
    .select("id, customer_id, provider_id, status, transport_services(title)")
    .eq("id", params.requestId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { success: false, message: "Pedido não encontrado." };
  }

  const providerId = await getCurrentProviderId(userProfile.id);
  const actor = resolveTransportRequestActor({
    profileId: userProfile.id,
    providerId,
    customerId: existing.customer_id,
    requestProviderId: existing.provider_id,
  });

  if (
    !canActorChangeTransportRequestStatus({
      actor,
      from: existing.status,
      to: params.status,
    })
  ) {
    return { success: false, message: "Não autorizado." };
  }

  const lockColumn = actor === "transporter" ? "provider_id" : "customer_id";
  const lockValue = actor === "transporter" ? providerId : userProfile.id;
  if (!lockValue) {
    return { success: false, message: "Não autorizado." };
  }

  const { data: updated, error } = await (supabase.from("transport_requests") as any)
    .update({ status: params.status })
    .eq("id", params.requestId)
    .eq("status", existing.status)
    .eq(lockColumn, lockValue)
    .select("id")
    .maybeSingle();

  if (error || !updated?.id) {
    return { success: false, message: "Não foi possível atualizar o pedido." };
  }

  revalidateTransportPaths();

  const relatedTransport = Array.isArray(existing.transport_services)
    ? existing.transport_services[0]
    : existing.transport_services;
  const transportTitle = relatedTransport?.title ? ` para "${relatedTransport.title}"` : "";

  if (actor === "transporter") {
    const statusLabel =
      params.status === "accepted"
        ? "confirmado"
        : params.status === "rejected"
          ? "recusado"
          : params.status === "completed"
            ? "concluído"
            : "cancelado";

    await notifyTransportRequest({
      profileId: existing.customer_id,
      type: "transport.request_update",
      title: `Pedido de transporte ${statusLabel}`,
      message: `O seu pedido de transporte${transportTitle} foi ${statusLabel} pelo transportador.`,
      linkUrl: "/dashboard/transport/requests/sending",
      data: { requestId: params.requestId, status: params.status },
    });
  } else {
    const admin = tryCreateAdminServerSupabaseClient();
    if (admin) {
      const { data: providerRow } = await (admin.from("provider_profiles") as any)
        .select("profile_id")
        .eq("id", existing.provider_id)
        .maybeSingle();

      if (providerRow?.profile_id) {
        await notifyTransportRequest({
          profileId: providerRow.profile_id,
          type: "transport.request_update",
          title: "Pedido de transporte cancelado",
          message: `Um pedido de transporte${transportTitle} foi cancelado pelo cliente.`,
          linkUrl: "/dashboard/transport/requests/receiving",
          data: { requestId: params.requestId, status: params.status },
        });
      }
    }
  }

  return { success: true, message: "Estado do pedido atualizado." };
}
