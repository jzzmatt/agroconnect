import type {
  CartItemDescriptor,
  OrderDescriptor,
  OrderItemDescriptor,
  OrderSellerGroupDescriptor,
  ShoppingCart,
} from "@/types/commerce";

export function emptyShoppingCart(customerId: string | null = null): ShoppingCart {
  return {
    id: customerId ? `cart-${customerId}` : "cart-anonymous",
    customer_id: customerId,
    currency: "AOA",
    items: [],
    items_count: 0,
    subtotal: 0,
    delivery_fee: 0,
    discount: 0,
    total: 0,
    sellers_count: 0,
  };
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toSerializableCartItem(item: CartItemDescriptor): CartItemDescriptor {
  return {
    id: String(item.id || ""),
    product_id: String(item.product_id || ""),
    seller_id: String(item.seller_id || ""),
    seller_name: String(item.seller_name || "Vendedor Agrícola"),
    seller_slug: item.seller_slug ? String(item.seller_slug) : undefined,
    title: String(item.title || "Produto"),
    slug: String(item.slug || ""),
    unit_price: asNumber(item.unit_price),
    quantity: Math.max(0, Math.floor(asNumber(item.quantity))),
    unit: String(item.unit || "unidade"),
    subtotal: asNumber(item.subtotal),
    currency: String(item.currency || "AOA"),
    image_url: item.image_url ? String(item.image_url) : null,
    max_available_quantity:
      item.max_available_quantity == null ? undefined : asNumber(item.max_available_quantity),
    is_available: Boolean(item.is_available),
  };
}

export function toSerializableCart(cart: ShoppingCart | null | undefined): ShoppingCart {
  if (!cart) return emptyShoppingCart();
  const items = Array.isArray(cart.items) ? cart.items.map(toSerializableCartItem) : [];
  const subtotal = asNumber(cart.subtotal, items.reduce((sum, item) => sum + item.subtotal, 0));
  const deliveryFee = asNumber(cart.delivery_fee);
  const discount = asNumber(cart.discount);
  return {
    id: String(cart.id || "cart-anonymous"),
    customer_id: cart.customer_id ?? null,
    currency: String(cart.currency || "AOA"),
    items,
    items_count: asNumber(
      cart.items_count,
      items.reduce((sum, item) => sum + item.quantity, 0)
    ),
    subtotal,
    delivery_fee: deliveryFee,
    discount,
    total: asNumber(cart.total, subtotal + deliveryFee - discount),
    sellers_count: asNumber(cart.sellers_count, new Set(items.map((item) => item.seller_id)).size),
  };
}

export function cartErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error && error.message ? error.message : String(error || "");
  if (/minified react error|#441|server components render|digest/i.test(message)) {
    return fallback;
  }
  return message.trim() || fallback;
}

export function toSerializableOrderItem(item: OrderItemDescriptor): OrderItemDescriptor {
  return {
    id: String(item.id || ""),
    order_id: String(item.order_id || ""),
    product_id: item.product_id ? String(item.product_id) : null,
    seller_id: String(item.seller_id || ""),
    product_title: String(item.product_title || "Produto"),
    product_slug: item.product_slug ? String(item.product_slug) : null,
    sku: item.sku ? String(item.sku) : null,
    unit: String(item.unit || "unidade"),
    quantity: asNumber(item.quantity),
    unit_price: asNumber(item.unit_price),
    subtotal: asNumber(item.subtotal),
    currency: String(item.currency || "AOA"),
  };
}

export function toSerializableOrder(order: OrderDescriptor): OrderDescriptor {
  const items = Array.isArray(order.items) ? order.items.map(toSerializableOrderItem) : [];
  const groups: OrderSellerGroupDescriptor[] = Array.isArray(order.seller_groups)
    ? order.seller_groups.map((group) => ({
        id: String(group.id || ""),
        order_id: String(group.order_id || order.id || ""),
        seller_id: String(group.seller_id || ""),
        seller_name: String(group.seller_name || "Vendedor Agrícola"),
        seller_slug: group.seller_slug ? String(group.seller_slug) : undefined,
        status: group.status,
        delivery_status: group.delivery_status,
        fulfillment_method: group.fulfillment_method,
        courier_id: group.courier_id ? String(group.courier_id) : null,
        courier_name: group.courier_name ? String(group.courier_name) : null,
        courier_phone: group.courier_phone ? String(group.courier_phone) : null,
        courier_whatsapp: group.courier_whatsapp ? String(group.courier_whatsapp) : null,
        delivery_otp: group.delivery_otp ? String(group.delivery_otp) : null,
        proof_of_delivery_type: group.proof_of_delivery_type || null,
        delivered_at: group.delivered_at ? String(group.delivered_at) : null,
        failed_reason: group.failed_reason ? String(group.failed_reason) : null,
        subtotal: asNumber(group.subtotal),
        delivery_fee: asNumber(group.delivery_fee),
        total: asNumber(group.total),
        seller_notes: group.seller_notes ? String(group.seller_notes) : null,
        transport_request_id: group.transport_request_id ? String(group.transport_request_id) : null,
        transport_status: group.transport_status || null,
        transport_provider_id: group.transport_provider_id ? String(group.transport_provider_id) : null,
        transport_provider_name: group.transport_provider_name ? String(group.transport_provider_name) : null,
        transport_provider_phone: group.transport_provider_phone ? String(group.transport_provider_phone) : null,
        transport_title: group.transport_title ? String(group.transport_title) : null,
        transport_origin: group.transport_origin ? String(group.transport_origin) : null,
        transport_destination: group.transport_destination ? String(group.transport_destination) : null,
        items: Array.isArray(group.items) ? group.items.map(toSerializableOrderItem) : items.filter((item) => item.seller_id === group.seller_id),
      }))
    : [];
  return {
    id: String(order.id || ""),
    order_number: String(order.order_number || ""),
    customer_id: String(order.customer_id || ""),
    customer_name: order.customer_name ? String(order.customer_name) : undefined,
    customer_email: order.customer_email ? String(order.customer_email) : undefined,
    customer_phone: order.customer_phone ? String(order.customer_phone) : undefined,
    status: order.status,
    payment_status: order.payment_status,
    fulfillment_method: order.fulfillment_method,
    currency: String(order.currency || "AOA"),
    subtotal: asNumber(order.subtotal),
    delivery_fee: asNumber(order.delivery_fee),
    discount: asNumber(order.discount),
    tax: asNumber(order.tax),
    total: asNumber(order.total),
    shipping_address: order.shipping_address || null,
    notes: order.notes ? String(order.notes) : null,
    cancelled_reason: order.cancelled_reason ? String(order.cancelled_reason) : null,
    items,
    seller_groups: groups,
    payment: order.payment
      ? {
          id: String(order.payment.id || ""),
          order_id: String(order.payment.order_id || order.id || ""),
          provider: String(order.payment.provider || ""),
          provider_payment_id: order.payment.provider_payment_id
            ? String(order.payment.provider_payment_id)
            : null,
          payment_method: order.payment.payment_method,
          amount: asNumber(order.payment.amount),
          currency: String(order.payment.currency || "AOA"),
          status: order.payment.status,
          paid_at: order.payment.paid_at ? String(order.payment.paid_at) : null,
          created_at: String(order.payment.created_at || order.created_at),
        }
      : null,
    created_at: String(order.created_at || ""),
    updated_at: String(order.updated_at || order.created_at || ""),
  };
}
