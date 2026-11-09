function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function sellerGroupProductValue(group: {
  subtotal?: number;
  total?: number;
  items?: Array<{ subtotal?: number }>;
}): number {
  if (Array.isArray(group.items) && group.items.length > 0) {
    const fromItems = group.items.reduce((sum, item) => sum + asNumber(item.subtotal), 0);
    if (fromItems > 0) return fromItems;
  }
  const fromSubtotal = asNumber(group.subtotal);
  if (fromSubtotal > 0) return fromSubtotal;
  return asNumber(group.total);
}

export function isCompletedPaidProductGroup(params: {
  paymentStatus?: string | null;
  fulfillmentStatus?: string | null;
  orderStatus?: string | null;
}): boolean {
  const fulfillment = String(params.fulfillmentStatus || "");
  const orderStatus = String(params.orderStatus || "");
  const payment = String(params.paymentStatus || "");
  if (fulfillment === "cancelled" || orderStatus === "cancelled") return false;
  if (payment === "failed" || payment === "cancelled" || payment === "refunded" || payment === "partially_refunded") {
    return false;
  }
  return fulfillment === "completed" || orderStatus === "completed";
}
