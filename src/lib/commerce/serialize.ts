import type { CartItemDescriptor, ShoppingCart } from "@/types/commerce";

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
