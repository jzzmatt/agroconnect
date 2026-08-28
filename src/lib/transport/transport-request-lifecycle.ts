import type { TransportListItem, TransportRequestStatus } from "@/types/transport";

export type TransportRequestActor = "requester" | "transporter" | "other";

export const TRANSPORT_REQUEST_STATUS_TRANSITIONS: Record<
  TransportRequestStatus,
  readonly TransportRequestStatus[]
> = {
  pending: ["accepted", "rejected", "cancelled"],
  accepted: ["completed", "cancelled"],
  rejected: [],
  completed: [],
  cancelled: [],
};

export function isTransportServiceId(value?: string | null): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

export function transportRequestDisplayStatus(
  status: TransportRequestStatus
): "pending" | "confirmed" | "rejected" | "completed" | "cancelled" {
  return status === "accepted" ? "confirmed" : status;
}

export function isVisibleOnSendingRequests(status: TransportRequestStatus): boolean {
  return status !== "cancelled";
}

export const TRANSPORT_SENDING_REQUESTS_PATH = "/dashboard/transport/requests/sending";
export const TRANSPORT_RECEIVING_REQUESTS_PATH = "/dashboard/transport/requests/receiving";

export function canTransitionTransportRequestStatus(
  from: TransportRequestStatus,
  to: TransportRequestStatus
): boolean {
  if (from === to) return false;
  return TRANSPORT_REQUEST_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function resolveTransportRequestActor(params: {
  profileId: string;
  providerId: string | null;
  customerId: string;
  requestProviderId: string;
}): TransportRequestActor {
  if (params.providerId && params.requestProviderId === params.providerId) {
    return "transporter";
  }
  if (params.customerId === params.profileId) {
    return "requester";
  }
  return "other";
}

export function canActorChangeTransportRequestStatus(params: {
  actor: TransportRequestActor;
  from: TransportRequestStatus;
  to: TransportRequestStatus;
}): boolean {
  if (params.actor === "other") return false;
  if (!canTransitionTransportRequestStatus(params.from, params.to)) return false;

  if (params.actor === "requester") {
    return params.from === "pending" && params.to === "cancelled";
  }

  if (params.from === "pending") {
    return params.to === "accepted" || params.to === "rejected";
  }

  if (params.from === "accepted") {
    return params.to === "completed" || params.to === "cancelled";
  }

  return false;
}

export function requirePersistedRequestId(
  data: { id?: string } | null | undefined,
  error: { message?: string } | null | undefined
): { ok: true; requestId: string } | { ok: false; error: string } {
  if (error || !data?.id) {
    return {
      ok: false,
      error: error?.message || "Não foi possível gravar o pedido de transporte.",
    };
  }
  return { ok: true, requestId: data.id };
}

export function buildTransportRequestInsert(params: {
  customerId: string;
  transport: Pick<
    TransportListItem,
    | "id"
    | "provider_id"
    | "origin_label"
    | "destination_label"
    | "price_per_trip"
    | "price_per_load"
    | "currency"
  >;
  message: string;
  originNotes?: string;
  destinationNotes?: string;
  requestedDate?: string | null;
  orderId?: string | null;
  sellerGroupId?: string | null;
  requestSource?: string | null;
}): {
  customer_id: string;
  provider_id: string;
  transport_service_id: string;
  message: string;
  origin_notes: string | null;
  destination_notes: string | null;
  requested_date: string | null;
  estimated_trip_price: number;
  estimated_load_price: number;
  status: "pending";
  currency: string;
  order_id?: string;
  seller_group_id?: string;
  request_source?: string;
} {
  const originNotes = params.originNotes?.trim() || params.transport.origin_label || null;
  const destinationNotes =
    params.destinationNotes?.trim() || params.transport.destination_label || null;

  const row: {
    customer_id: string;
    provider_id: string;
    transport_service_id: string;
    message: string;
    origin_notes: string | null;
    destination_notes: string | null;
    requested_date: string | null;
    estimated_trip_price: number;
    estimated_load_price: number;
    status: "pending";
    currency: string;
    order_id?: string;
    seller_group_id?: string;
    request_source?: string;
  } = {
    customer_id: params.customerId,
    provider_id: params.transport.provider_id,
    transport_service_id: params.transport.id,
    message: params.message.trim(),
    origin_notes: originNotes,
    destination_notes: destinationNotes,
    requested_date: params.requestedDate || null,
    estimated_trip_price: params.transport.price_per_trip,
    estimated_load_price: params.transport.price_per_load,
    status: "pending",
    currency: params.transport.currency || "AOA",
  };

  if (params.orderId) row.order_id = params.orderId;
  if (params.sellerGroupId) row.seller_group_id = params.sellerGroupId;
  if (params.requestSource) row.request_source = params.requestSource;

  return row;
}
