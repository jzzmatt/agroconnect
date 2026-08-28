import type { OrderDescriptor, OrderSellerGroupDescriptor, OrderTransportStatus } from "@/types/commerce";
import type { TransportListItem, TransportRequestStatus } from "@/types/transport";

export const ORDER_EXPEDITION_REQUEST_SOURCE = "order_expedition" as const;

export const ACTIVE_ORDER_TRANSPORT_REQUEST_STATUSES = ["pending", "accepted"] as const;

export type ActiveOrderTransportRequestStatus =
  (typeof ACTIVE_ORDER_TRANSPORT_REQUEST_STATUSES)[number];

export function isOrderExpeditionSource(value?: string | null): boolean {
  return value === ORDER_EXPEDITION_REQUEST_SOURCE;
}

export function shouldBlockSelfTransportRequest(params: {
  requestSource?: string | null;
  actorProviderIds: string[];
  transportProviderId: string;
}): boolean {
  if (!params.transportProviderId) return false;
  if (!params.actorProviderIds.includes(params.transportProviderId)) return false;
  // Marketplace customers cannot book their own published service.
  // Order expedition may use the seller's own published fleet to ship goods.
  return !isOrderExpeditionSource(params.requestSource);
}

export function isActiveOrderTransportRequestStatus(
  status?: string | null
): status is ActiveOrderTransportRequestStatus {
  return status === "pending" || status === "accepted";
}

export function isBlockingOrderTransportStatus(
  status?: OrderTransportStatus | null
): boolean {
  return status === "requested" || status === "accepted";
}

export function mapTransportRequestStatusToOrderTransport(
  status: TransportRequestStatus
): OrderTransportStatus {
  if (status === "pending") return "requested";
  if (status === "accepted") return "accepted";
  if (status === "completed") return "completed";
  return "rejected";
}

export function shouldShipOnTransportComplete(
  fulfillmentStatus: OrderSellerGroupDescriptor["status"] | string
): boolean {
  return (
    fulfillmentStatus !== "completed" &&
    fulfillmentStatus !== "cancelled" &&
    fulfillmentStatus !== "shipped"
  );
}

export function isOrderGroupEligibleForExpedition(params: {
  orderStatus: OrderDescriptor["status"] | string;
  groupStatus: OrderSellerGroupDescriptor["status"] | string;
  transportStatus?: OrderTransportStatus | null;
}): { ok: true } | { ok: false; code: "ORDER_NOT_ELIGIBLE" | "ACTIVE_TRANSPORT_REQUEST" } {
  const blockedOrder = new Set(["cancelled", "completed", "failed", "refunded"]);
  const blockedGroup = new Set(["cancelled", "completed", "shipped"]);

  if (blockedOrder.has(params.orderStatus) || blockedGroup.has(params.groupStatus)) {
    return { ok: false, code: "ORDER_NOT_ELIGIBLE" };
  }

  if (isBlockingOrderTransportStatus(params.transportStatus)) {
    return { ok: false, code: "ACTIVE_TRANSPORT_REQUEST" };
  }

  return { ok: true };
}

export function canSellerExpedirGroup(params: {
  orderStatus: OrderDescriptor["status"] | string;
  groupStatus: OrderSellerGroupDescriptor["status"] | string;
  transportStatus?: OrderTransportStatus | null;
}): boolean {
  return isOrderGroupEligibleForExpedition(params).ok;
}

export function resolveOrderDestinationLabel(order: OrderDescriptor): string | null {
  const address = order.shipping_address;
  const parts = [
    address?.address_line,
    address?.municipality_name,
    address?.province_name,
  ].filter((part): part is string => Boolean(part && part.trim()));
  if (parts.length > 0) return parts.join(", ");
  return null;
}

export function buildOrderExpeditionMessage(params: {
  orderNumber: string;
  items: Array<{ quantity: number; product_title: string }>;
  destination?: string | null;
  notes?: string | null;
}): string {
  const productLines = params.items
    .map((item) => `${item.quantity} × ${item.product_title}`)
    .join("\n");
  const destination = params.destination?.trim() || null;
  const notes = params.notes?.trim() || null;

  const parts = [
    `Pedido de transporte para a encomenda #${params.orderNumber}.`,
    "",
    "Produtos:",
    productLines || "—",
  ];

  if (destination) {
    parts.push("", "Destino:", destination);
  }

  parts.push("", "Por favor confirme a disponibilidade para realizar este transporte.");

  if (notes) {
    parts.push("", "Notas do vendedor:", notes);
  }

  return parts.join("\n");
}

export function preferredTransportPrice(transport: Pick<
  TransportListItem,
  "price_per_trip" | "price_per_load"
>): { amount: number; unit: "trip" | "load" } {
  if (transport.price_per_trip > 0) {
    return { amount: transport.price_per_trip, unit: "trip" };
  }
  return { amount: transport.price_per_load, unit: "load" };
}

export function formatTransportDisplayPrice(amount: number, currency = "AOA"): string {
  return `${amount.toLocaleString("pt-AO")} ${currency === "AOA" ? "Kz" : currency}`;
}

export function matchesPublishedTransportQuery(
  transport: TransportListItem,
  query: string
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    transport.title,
    transport.provider_name,
    transport.origin_label,
    transport.destination_label,
    transport.vehicle_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function isMissingSchemaError(
  error: { code?: string | null; message?: string | null } | null | undefined
): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const message = String(error.message || "");
  return (
    code === "PGRST204" ||
    code === "42703" ||
    /schema cache|does not exist|could not find the .* column/i.test(message)
  );
}

export function buildOrderExpeditionMetadata(params: {
  orderId: string;
  sellerGroupId: string;
  orderNumber: string;
}): Record<string, string> {
  return {
    order_id: params.orderId,
    seller_group_id: params.sellerGroupId,
    request_source: ORDER_EXPEDITION_REQUEST_SOURCE,
    order_number: params.orderNumber,
  };
}

export function extractOrderExpeditionLink(row: {
  order_id?: unknown;
  seller_group_id?: unknown;
  request_source?: unknown;
  order_number?: unknown;
  metadata?: unknown;
  orders?: unknown;
}): {
  orderId: string | null;
  sellerGroupId: string | null;
  requestSource: string | null;
  orderNumber: string | null;
} {
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const relatedOrder = Array.isArray(row.orders) ? row.orders[0] : row.orders;
  const relatedNumber =
    relatedOrder && typeof relatedOrder === "object"
      ? (relatedOrder as { order_number?: unknown }).order_number
      : null;

  const orderId = row.order_id || metadata.order_id;
  const sellerGroupId = row.seller_group_id || metadata.seller_group_id;
  const requestSource = row.request_source || metadata.request_source;
  const orderNumber = row.order_number || relatedNumber || metadata.order_number;

  return {
    orderId: orderId ? String(orderId) : null,
    sellerGroupId: sellerGroupId ? String(sellerGroupId) : null,
    requestSource: requestSource ? String(requestSource) : null,
    orderNumber: orderNumber ? String(orderNumber) : null,
  };
}

export function sellerGroupIdFromTransportRequestRow(row: {
  seller_group_id?: string | null;
  metadata?: unknown;
}): string | null {
  return extractOrderExpeditionLink(row).sellerGroupId;
}

export function withoutOrderLinkColumns<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row };
  delete next.order_id;
  delete next.seller_group_id;
  delete next.request_source;
  return next;
}
