"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, isSupabaseConfigured, tryCreateAdminServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import { can, getCurrentSubject } from "@/lib/authorization/server";
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
  isVisibleOnSendingRequests,
  requirePersistedRequestId,
  resolveTransportRequestActor,
} from "@/lib/transport/transport-request-lifecycle";
import { canPermanentlyDeleteTransport } from "@/lib/transport/transport-delete-flow";
import { validateTransportForPublication } from "@/lib/transport/transport-publication-validation";
import type {
  TransportListItem,
  TransportPublicationStatus,
  TransportRequestItem,
  TransportRequestStatus,
} from "@/types/transport";
import {
  persistFindActiveOrderTransportRequest,
  persistGetOrderByNumber,
  persistGetSellerGroupById,
  persistLinkSellerGroupTransport,
  persistSyncSellerGroupTransport,
} from "@/lib/commerce/persist";
import { resolveSessionSellerIds } from "@/lib/commerce/session-seller";
import {
  buildOrderExpeditionMessage,
  buildOrderExpeditionMetadata,
  extractOrderExpeditionLink,
  isMissingSchemaError,
  isOrderExpeditionSource,
  isOrderGroupEligibleForExpedition,
  mapTransportRequestStatusToOrderTransport,
  ORDER_EXPEDITION_REQUEST_SOURCE,
  resolveOrderDestinationLabel,
  shouldShipOnTransportComplete,
  shouldBlockSelfTransportRequest,
  withoutOrderLinkColumns,
} from "@/lib/transport/order-expedition";
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

function revalidateOrderTransportPaths(orderNumber?: string | null) {
  revalidateTransportPaths();
  revalidatePath("/dashboard/orders");
  if (orderNumber) {
    revalidatePath(`/orders/${orderNumber}`);
  }
}

const TRANSPORT_REQUEST_CORE_SELECT = `
  id,
  customer_id,
  provider_id,
  status,
  metadata,
  transport_services(title)
`;

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

async function loadTransportRequestRow(requestId: string): Promise<Record<string, unknown> | null> {
  const clients = [
    await createServerSupabaseClient(),
    tryCreateAdminServerSupabaseClient(),
  ].filter(Boolean);

  const selects = [
    `${TRANSPORT_REQUEST_CORE_SELECT}, order_id, seller_group_id, request_source, orders:order_id(order_number)`,
    TRANSPORT_REQUEST_CORE_SELECT,
    "*",
  ];

  for (const client of clients) {
    for (const select of selects) {
      const { data, error } = await (client as any)
        .from("transport_requests")
        .select(select)
        .eq("id", requestId)
        .maybeSingle();
      if (!error && data?.id) return data as Record<string, unknown>;
      if (error && !isMissingSchemaError(error)) {
        console.warn("[loadTransportRequestRow]", error);
      }
    }
  }

  return null;
}

async function listTransportRequests(
  column: "provider_id" | "customer_id",
  value: string,
  options?: { excludeCancelled?: boolean }
): Promise<TransportRequestItem[]> {
  const supabase = await createServerSupabaseClient();
  let query = (supabase.from("transport_requests") as any)
    .select(TRANSPORT_REQUEST_SELECT)
    .eq(column, value)
    .order("created_at", { ascending: false });

  if (options?.excludeCancelled) {
    query = query.neq("status", "cancelled");
  }

  const { data, error } = await query;
  if (!error && data) {
    return data
      .map((row: Record<string, unknown>) => TransportService.mapRequestRow(row))
      .filter((row: TransportRequestItem) =>
        options?.excludeCancelled ? isVisibleOnSendingRequests(row.status) : true
      );
  }

  console.warn("[listTransportRequests] embed query failed, retrying without joins:", error);
  let fallbackQuery = (supabase.from("transport_requests") as any)
    .select("*")
    .eq(column, value)
    .order("created_at", { ascending: false });

  if (options?.excludeCancelled) {
    fallbackQuery = fallbackQuery.neq("status", "cancelled");
  }

  const fallback = await fallbackQuery;

  if (fallback.error || !fallback.data) return [];
  return fallback.data
    .map((row: Record<string, unknown>) => TransportService.mapRequestRow(row))
    .filter((row: TransportRequestItem) =>
      options?.excludeCancelled ? isVisibleOnSendingRequests(row.status) : true
    );
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

function isDuplicateActiveTransportError(error: { code?: string; message?: string } | null | undefined): boolean {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  return (
    code === "23505" ||
    /idx_transport_requests_active_seller_group|duplicate key|unique constraint/i.test(message)
  );
}

async function insertTransportRequestAndNotify(params: {
  insert: ReturnType<typeof buildTransportRequestInsert>;
  transport: TransportListItem;
  notify: {
    title: string;
    message: string;
    data?: Record<string, unknown>;
  };
  revalidateOrders?: boolean;
  orderNumber?: string | null;
  privileged?: boolean;
}): Promise<{ success: true; requestId: string } | { success: false; message: string; code?: string }> {
  const supabase = params.privileged
    ? await getTransportWritableClient()
    : await createServerSupabaseClient();

  let { data, error } = await (supabase.from("transport_requests") as any)
    .insert(params.insert)
    .select("id")
    .single();

  if (params.privileged && isMissingSchemaError(error)) {
    const fallbackInsert = withoutOrderLinkColumns(params.insert);
    ({ data, error } = await (supabase.from("transport_requests") as any)
      .insert(fallbackInsert)
      .select("id")
      .single());
  }

  if (isDuplicateActiveTransportError(error)) {
    return {
      success: false,
      message: "Este pedido já possui um pedido de transporte ativo.",
      code: "ACTIVE_TRANSPORT_REQUEST",
    };
  }

  const persisted = requirePersistedRequestId(data, error);
  if (!persisted.ok) {
    console.warn("[insertTransportRequestAndNotify] DB error:", error);
    return {
      success: false,
      message: "Não foi possível gravar o pedido de transporte.",
      code: "DATABASE_ERROR",
    };
  }

  if (params.revalidateOrders) {
    revalidateOrderTransportPaths(params.orderNumber);
    revalidatePath(`/transport/${params.transport.slug}`);
    revalidatePath("/agriservice");
  } else {
    revalidateTransportPaths(params.transport.slug);
  }

  const admin = tryCreateAdminServerSupabaseClient();
  if (admin) {
    const { data: providerRow } = await (admin.from("provider_profiles") as any)
      .select("profile_id")
      .eq("id", params.transport.provider_id)
      .maybeSingle();

    if (providerRow?.profile_id) {
      await notifyTransportRequest({
        profileId: providerRow.profile_id,
        type: "transport.request",
        title: params.notify.title,
        message: params.notify.message,
        linkUrl: "/dashboard/transport/requests/receiving",
        data: {
          requestId: persisted.requestId,
          transportServiceId: params.transport.id,
          ...(params.notify.data || {}),
        },
      });
    }
  }

  return { success: true, requestId: persisted.requestId };
}

async function loadProviderNotificationName(providerId: string): Promise<string | null> {
  const admin = tryCreateAdminServerSupabaseClient();
  if (!admin) return null;
  const { data } = await (admin.from("provider_profiles") as any)
    .select("business_name")
    .eq("id", providerId)
    .maybeSingle();
  return data?.business_name ? String(data.business_name) : null;
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
  if (
    shouldBlockSelfTransportRequest({
      actorProviderIds: actorProviderId ? [actorProviderId] : [],
      transportProviderId: transport.provider_id,
    })
  ) {
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

  const persisted = await insertTransportRequestAndNotify({
    insert,
    transport,
    notify: {
      title: "Novo pedido de transporte",
      message: `Recebeu um novo pedido de transporte para "${transport.title}".`,
    },
  });

  if (!persisted.success) {
    return { success: false, message: persisted.message };
  }

  return {
    success: true,
    message: "Pedido de transporte enviado com sucesso ao transportador!",
    requestId: persisted.requestId,
  };
}

export async function createOrderTransportRequestAction(params: {
  orderNumber: string;
  transportServiceId: string;
  notes?: string;
  sellerGroupId?: string;
}): Promise<{ success: boolean; message: string; requestId?: string; code?: string }> {
  try {
    await requireAuth();
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) {
      return { success: false, message: "É necessário ter perfil ativo para solicitar transporte.", code: "UNAUTHENTICATED" };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, message: "O pedido não pôde ser gravado. Tente novamente.", code: "DATABASE_ERROR" };
    }

    const orderNumber = String(params.orderNumber || "").trim();
    if (!orderNumber) {
      return { success: false, message: "Encomenda inválida.", code: "NOT_FOUND" };
    }

    if (!isTransportServiceId(params.transportServiceId)) {
      return { success: false, message: "Serviço de transporte inválido.", code: "TRANSPORT_NOT_PUBLISHED" };
    }

    const sellerIds = await resolveSessionSellerIds();
    if (sellerIds.length === 0) {
      return { success: false, message: "Não autorizado.", code: "UNAUTHORIZED" };
    }

    const order = await persistGetOrderByNumber(orderNumber, { sellerId: sellerIds });
    if (!order) {
      return { success: false, message: "Encomenda não encontrada.", code: "NOT_FOUND" };
    }

    const ownedGroups = order.seller_groups.filter((group) => sellerIds.includes(group.seller_id));
    const sellerGroup = params.sellerGroupId
      ? ownedGroups.find((group) => group.id === params.sellerGroupId)
      : ownedGroups[0];

    if (!sellerGroup) {
      return { success: false, message: "Não autorizado.", code: "UNAUTHORIZED" };
    }

    const eligibility = isOrderGroupEligibleForExpedition({
      orderStatus: order.status,
      groupStatus: sellerGroup.status,
      transportStatus: sellerGroup.transport_status,
    });
    if (!eligibility.ok) {
      return {
        success: false,
        message:
          eligibility.code === "ACTIVE_TRANSPORT_REQUEST"
            ? "Este pedido já possui um pedido de transporte ativo."
            : "Esta encomenda já não pode ser expedida.",
        code: eligibility.code,
      };
    }

    const activeRequest = await persistFindActiveOrderTransportRequest(sellerGroup.id);
    if (activeRequest) {
      return {
        success: false,
        message: "Este pedido já possui um pedido de transporte ativo.",
        code: "ACTIVE_TRANSPORT_REQUEST",
      };
    }

    const transport = await TransportService.getPublishedTransportById(params.transportServiceId);
    if (!transport) {
      return {
        success: false,
        message: "O serviço de transporte publicado não foi encontrado.",
        code: "TRANSPORT_NOT_PUBLISHED",
      };
    }

    if (
      shouldBlockSelfTransportRequest({
        requestSource: ORDER_EXPEDITION_REQUEST_SOURCE,
        actorProviderIds: sellerIds,
        transportProviderId: transport.provider_id,
      })
    ) {
      return {
        success: false,
        message: "Não pode solicitar o seu próprio transporte.",
        code: "SELF_REQUEST",
      };
    }

    const destination = resolveOrderDestinationLabel(order);
    const message = buildOrderExpeditionMessage({
      orderNumber: order.order_number,
      items: sellerGroup.items.length > 0 ? sellerGroup.items : order.items,
      destination,
      notes: params.notes,
    });

    const insert = buildTransportRequestInsert({
      customerId: userProfile.id,
      transport,
      message,
      originNotes: transport.origin_label || undefined,
      destinationNotes: destination || transport.destination_label || undefined,
      orderId: order.id,
      sellerGroupId: sellerGroup.id,
      requestSource: ORDER_EXPEDITION_REQUEST_SOURCE,
      metadata: buildOrderExpeditionMetadata({
        orderId: order.id,
        sellerGroupId: sellerGroup.id,
        orderNumber: order.order_number,
      }),
    });

    const persisted = await insertTransportRequestAndNotify({
      insert,
      transport,
      revalidateOrders: true,
      privileged: true,
      orderNumber: order.order_number,
      notify: {
        title: "Novo pedido de transporte",
        message: `Recebeu um pedido de transporte para a encomenda #${order.order_number}.`,
        data: {
          orderId: order.id,
          orderNumber: order.order_number,
          sellerGroupId: sellerGroup.id,
          requestSource: ORDER_EXPEDITION_REQUEST_SOURCE,
        },
      },
    });

    if (!persisted.success) {
      return persisted;
    }

    const linked = await persistLinkSellerGroupTransport({
      sellerGroupId: sellerGroup.id,
      sellerIds,
      transportRequestId: persisted.requestId,
      transportStatus: "requested",
      transportProviderId: transport.provider_id,
    });

    if (linked === false) {
      return {
        success: false,
        message: "Não foi possível associar o transporte à encomenda.",
        code: "UNAUTHORIZED",
      };
    }

    revalidateOrderTransportPaths(order.order_number);

    return {
      success: true,
      message: "Pedido de transporte enviado com sucesso ao transportador!",
      requestId: persisted.requestId,
    };
  } catch (error) {
    console.warn("[createOrderTransportRequestAction]", error);
    return {
      success: false,
      message: "Não foi possível enviar o pedido de transporte. Tente novamente.",
      code: "DATABASE_ERROR",
    };
  }
}

export async function getTransportRequestsForProviderAction(): Promise<TransportRequestItem[]> {
  const subject = await getCurrentSubject();
  if (!subject || !can(subject, "service.manage")) return [];

  const providerId = await getCurrentProviderId(subject.profileId);
  if (!providerId) return [];

  return listTransportRequests("provider_id", providerId);
}

export async function getCustomerTransportRequestsAction(): Promise<TransportRequestItem[]> {
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];

  return listTransportRequests("customer_id", userProfile.id, { excludeCancelled: true });
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

  const existing = await loadTransportRequestRow(params.requestId);
  if (!existing) {
    return { success: false, message: "Pedido não encontrado." };
  }

  const providerIds = await resolveSessionSellerIds();
  const providerId =
    providerIds.find((id) => id === String(existing.provider_id)) ||
    (await getCurrentProviderId(userProfile.id));
  const actor = resolveTransportRequestActor({
    profileId: userProfile.id,
    providerId,
    customerId: String(existing.customer_id),
    requestProviderId: String(existing.provider_id),
  });

  if (
    !canActorChangeTransportRequestStatus({
      actor,
      from: existing.status as TransportRequestStatus,
      to: params.status,
    })
  ) {
    return { success: false, message: "Não autorizado." };
  }

  if (actor === "transporter") {
    const subject = await getCurrentSubject();
    if (!subject || !can(subject, "service.manage")) {
      return { success: false, message: "Não autorizado." };
    }
  }

  const lockColumn = actor === "transporter" ? "provider_id" : "customer_id";
  const lockValue = actor === "transporter" ? providerId : userProfile.id;
  if (!lockValue) {
    return { success: false, message: "Não autorizado." };
  }

  const writable = await getTransportWritableClient();
  const { data: updated, error } = await (writable.from("transport_requests") as any)
    .update({ status: params.status })
    .eq("id", params.requestId)
    .eq("status", existing.status)
    .eq(lockColumn, lockValue)
    .select("id")
    .maybeSingle();

  if (error || !updated?.id) {
    return { success: false, message: "Não foi possível atualizar o pedido." };
  }

  const orderLink = extractOrderExpeditionLink(existing);
  const orderNumber = orderLink.orderNumber;
  const orderLinked =
    isOrderExpeditionSource(orderLink.requestSource) || Boolean(orderLink.orderId || orderLink.sellerGroupId);

  if (orderLinked && orderLink.sellerGroupId) {
    const transportStatus = mapTransportRequestStatusToOrderTransport(params.status);
    let fulfillmentStatus: "shipped" | undefined;
    if (params.status === "completed") {
      const group = await persistGetSellerGroupById(orderLink.sellerGroupId);
      if (group && shouldShipOnTransportComplete(group.status)) {
        fulfillmentStatus = "shipped";
      }
    }
    try {
      await persistSyncSellerGroupTransport({
        sellerGroupId: orderLink.sellerGroupId,
        transportRequestId: params.requestId,
        transportStatus,
        transportProviderId: String(existing.provider_id),
        fulfillmentStatus,
      });
    } catch (syncError) {
      console.warn("[updateTransportRequestStatusAction] order transport sync failed:", syncError);
    }
    revalidateOrderTransportPaths(orderNumber);
  } else {
    revalidateTransportPaths();
  }

  const relatedTransport = Array.isArray(existing.transport_services)
    ? existing.transport_services[0]
    : existing.transport_services;
  const transportTitle = relatedTransport?.title ? ` para "${relatedTransport.title}"` : "";
  const providerName = (await loadProviderNotificationName(String(existing.provider_id))) || "o transportador";

  if (actor === "transporter") {
    if (orderLinked && orderNumber) {
      const notice =
        params.status === "accepted"
          ? {
              title: "Transporte aceite",
              message: `O transportador ${providerName} aceitou o transporte da encomenda #${orderNumber}.`,
            }
          : params.status === "rejected"
            ? {
                title: "Transporte recusado",
                message: `O transportador ${providerName} recusou o transporte da encomenda #${orderNumber}.\n\nPode selecionar outro serviço de transporte.`,
              }
            : params.status === "completed"
              ? {
                  title: "Transporte concluído",
                  message: `O transporte da encomenda #${orderNumber} foi concluído.`,
                }
              : {
                  title: "Pedido de transporte cancelado",
                  message: `O transporte da encomenda #${orderNumber} foi cancelado.`,
                };

      await notifyTransportRequest({
        profileId: String(existing.customer_id),
        type: "transport.request_update",
        title: notice.title,
        message: notice.message,
        linkUrl: "/dashboard/orders",
        data: {
          requestId: params.requestId,
          status: params.status,
          orderNumber,
          requestSource: orderLink.requestSource,
        },
      });
    } else {
      const statusLabel =
        params.status === "accepted"
          ? "confirmado"
          : params.status === "rejected"
            ? "recusado"
            : params.status === "completed"
              ? "concluído"
              : "cancelado";

      await notifyTransportRequest({
        profileId: String(existing.customer_id),
        type: "transport.request_update",
        title: `Pedido de transporte ${statusLabel}`,
        message: `O seu pedido de transporte${transportTitle} foi ${statusLabel} pelo transportador.`,
        linkUrl: "/dashboard/transport/requests/sending",
        data: { requestId: params.requestId, status: params.status },
      });
    }
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
          message: orderNumber
            ? `Um pedido de transporte para a encomenda #${orderNumber} foi cancelado pelo cliente.`
            : `Um pedido de transporte${transportTitle} foi cancelado pelo cliente.`,
          linkUrl: "/dashboard/transport/requests/receiving",
          data: { requestId: params.requestId, status: params.status, orderNumber },
        });
      }
    }
  }

  return { success: true, message: "Estado do pedido atualizado." };
}
