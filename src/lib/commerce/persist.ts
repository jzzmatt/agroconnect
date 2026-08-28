import { createHash } from "node:crypto";
import { isSupabaseConfigured, tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/commerce/ids";
import { PaymentService } from "@/lib/payments";
import { ShoppingService } from "@/lib/services/shopping-service";
import { generateDeliveryOTP } from "@/lib/logistics/state-machine";
import { calculateDeliveryFee } from "@/lib/logistics/delivery-fee";
import type {
  ShoppingCart,
  CartItemDescriptor,
  CheckoutOrderInput,
  CustomerAddress,
  OrderDescriptor,
  OrderItemDescriptor,
  OrderSellerGroupDescriptor,
  OrderTransportStatus,
  PaymentRecordDescriptor,
  SellerEarningsSummary,
} from "@/types/commerce";
import {
  isMissingSchemaError,
  mapTransportRequestStatusToOrderTransport,
  sellerGroupIdFromTransportRequestRow,
} from "@/lib/transport/order-expedition";
import type { OrderStatus, PaymentStatus } from "@/types/database";

export interface CommercePersistActor {
  customerId: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
}

function persistClient(): any | null {
  if (!isSupabaseConfigured()) return null;
  return tryCreateAdminSupabaseClient() as any;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function emptyCart(customerId: string, cartId = `cart-${customerId}`): ShoppingCart {
  return {
    id: cartId,
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

function cartFromItems(customerId: string, cartId: string, items: CartItemDescriptor[]): ShoppingCart {
  const sellers = new Set(items.map((item) => item.seller_id));
  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  return {
    id: cartId,
    customer_id: customerId,
    currency: items[0]?.currency || "AOA",
    items,
    items_count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    delivery_fee: 0,
    discount: 0,
    total: subtotal,
    sellers_count: sellers.size,
  };
}

async function resolveCatalogProduct(productId: string) {
  const byId = await ShoppingService.getProductById(productId);
  if (byId) return byId;
  return ShoppingService.getProductBySlug(productId);
}

async function getOrCreateActiveCart(
  supabase: NonNullable<ReturnType<typeof persistClient>>,
  customerId: string
): Promise<{ id: string; currency: string }> {
  const existing = await supabase
    .from("carts")
    .select("id, currency, status")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .maybeSingle();

  if (existing.data?.id) {
    return { id: existing.data.id, currency: existing.data.currency || "AOA" };
  }

  const inserted = await supabase
    .from("carts")
    .insert({ customer_id: customerId, currency: "AOA", status: "active" })
    .select("id, currency")
    .single();

  if (inserted.error || !inserted.data?.id) {
    const retry = await supabase
      .from("carts")
      .select("id, currency")
      .eq("customer_id", customerId)
      .eq("status", "active")
      .maybeSingle();
    if (retry.data?.id) {
      return { id: retry.data.id, currency: retry.data.currency || "AOA" };
    }
    throw new Error(inserted.error?.message || "Não foi possível criar o carrinho.");
  }

  return { id: inserted.data.id, currency: inserted.data.currency || "AOA" };
}

async function mapCartItems(rows: Array<Record<string, unknown>>): Promise<CartItemDescriptor[]> {
  if (rows.length === 0) return [];

  const productIds = [...new Set(rows.map((row) => String(row.product_id || "")).filter(isUuid))];
  const products = new Map<string, Awaited<ReturnType<typeof resolveCatalogProduct>>>();
  await Promise.all(
    productIds.map(async (id) => {
      products.set(id, await resolveCatalogProduct(id));
    })
  );

  return rows.map((row) => {
    const product = products.get(String(row.product_id || ""));
    const quantity = asNumber(row.quantity, 1);
    const unitPrice = product?.price ?? asNumber(row.unit_price);
    return {
      id: String(row.id),
      product_id: String(row.product_id),
      seller_id: product?.seller_id || String(row.seller_id),
      seller_name: product?.seller_name || "Vendedor Agrícola",
      seller_slug: product?.seller_slug,
      title: product?.title || "Produto",
      slug: product?.slug || "",
      unit_price: unitPrice,
      quantity,
      unit: product?.unit || "unidade",
      subtotal: unitPrice * quantity,
      currency: product?.currency || String(row.currency || "AOA"),
      image_url: product?.image_url || null,
      max_available_quantity: product?.quantity,
      is_available: product?.availability_status !== "out_of_stock",
    };
  });
}

export async function persistGetCart(customerId: string): Promise<ShoppingCart | null> {
  const supabase = persistClient();
  if (!supabase) return null;

  const { data: cart, error } = await supabase
    .from("carts")
    .select("id, customer_id, currency, status")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!cart?.id) return emptyCart(customerId);

  const { data: rows, error: itemsError } = await supabase
    .from("cart_items")
    .select("*")
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: true });

  if (itemsError) throw new Error(itemsError.message);
  const items = await mapCartItems((rows || []) as Array<Record<string, unknown>>);
  return cartFromItems(customerId, cart.id, items);
}

export async function persistAddToCart(
  customerId: string,
  productId: string,
  quantityToAdd: number
): Promise<ShoppingCart | null> {
  const supabase = persistClient();
  if (!supabase) return null;

  const product = await resolveCatalogProduct(productId);
  if (!product || !isUuid(product.id)) {
    throw new Error("Produto não encontrado.");
  }
  if (product.availability_status === "out_of_stock") {
    throw new Error("Este produto encontra-se temporariamente sem stock.");
  }
  if (!isUuid(product.seller_id)) {
    throw new Error("Produto não encontrado.");
  }

  const cart = await getOrCreateActiveCart(supabase, customerId);
  const existing = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.id)
    .eq("product_id", product.id)
    .maybeSingle();

  const nextQty = asNumber(existing.data?.quantity) + quantityToAdd;
  if (product.quantity && nextQty > product.quantity) {
    throw new Error(`Apenas ${product.quantity} ${product.unit} disponíveis em stock.`);
  }

  if (existing.data?.id) {
    const { error } = await supabase
      .from("cart_items")
      .update({
        quantity: nextQty,
        unit_price: product.price,
        seller_id: product.seller_id,
        currency: product.currency || "AOA",
      })
      .eq("id", existing.data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("cart_items").insert({
      cart_id: cart.id,
      product_id: product.id,
      seller_id: product.seller_id,
      quantity: quantityToAdd,
      unit_price: product.price,
      currency: product.currency || "AOA",
    });
    if (error) throw new Error(error.message);
  }

  return persistGetCart(customerId);
}

export async function persistUpdateCartItemQuantity(
  customerId: string,
  productId: string,
  quantity: number
): Promise<ShoppingCart | null> {
  const supabase = persistClient();
  if (!supabase) return null;

  const cart = await persistGetCart(customerId);
  if (!cart) return null;
  const item = cart.items.find((entry) => entry.product_id === productId || entry.slug === productId);
  if (!item) return cart;

  if (quantity <= 0) {
    return persistRemoveFromCart(customerId, productId);
  }

  const product = await resolveCatalogProduct(item.product_id);
  if (product?.quantity && quantity > product.quantity) {
    throw new Error(`Apenas ${product.quantity} ${product.unit} disponíveis em stock.`);
  }

  const { error } = await supabase
    .from("cart_items")
    .update({
      quantity,
      unit_price: product?.price ?? item.unit_price,
    })
    .eq("id", item.id);
  if (error) throw new Error(error.message);
  return persistGetCart(customerId);
}

export async function persistRemoveFromCart(
  customerId: string,
  productId: string
): Promise<ShoppingCart | null> {
  const supabase = persistClient();
  if (!supabase) return null;
  const cart = await persistGetCart(customerId);
  if (!cart) return null;
  const item = cart.items.find((entry) => entry.product_id === productId || entry.slug === productId);
  if (!item) return cart;
  const { error } = await supabase.from("cart_items").delete().eq("id", item.id);
  if (error) throw new Error(error.message);
  return persistGetCart(customerId);
}

export async function persistClearCart(customerId: string): Promise<ShoppingCart | null> {
  const supabase = persistClient();
  if (!supabase) return null;
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .maybeSingle();
  if (cart?.id) {
    const { error } = await supabase.from("cart_items").delete().eq("cart_id", cart.id);
    if (error) throw new Error(error.message);
  }
  return persistGetCart(customerId);
}

function mapAddressSnapshot(
  snapshot: CheckoutOrderInput["shippingAddressSnapshot"],
  customerId: string
): CustomerAddress | null {
  if (!snapshot) return null;
  return {
    id: "addr-snapshot",
    profile_id: customerId,
    label: "Endereço de Entrega",
    recipient_name: snapshot.recipient_name,
    phone: snapshot.phone,
    address_line: snapshot.address_line,
    province_name: snapshot.province_name,
    municipality_name: snapshot.municipality_name,
    notes: snapshot.notes,
    is_default: true,
    created_at: new Date().toISOString(),
  };
}

async function loadProviderNames(
  supabase: NonNullable<ReturnType<typeof persistClient>>,
  sellerIds: string[]
): Promise<Map<string, { name: string; slug?: string; phone?: string | null }>> {
  const map = new Map<string, { name: string; slug?: string; phone?: string | null }>();
  const ids = sellerIds.filter(isUuid);
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("provider_profiles")
    .select("id, business_name, slug, phone")
    .in("id", ids);
  for (const row of data || []) {
    map.set(row.id, {
      name: row.business_name || "Vendedor Agrícola",
      slug: row.slug || undefined,
      phone: row.phone ? String(row.phone) : null,
    });
  }
  return map;
}

function matchesSellerScope(sellerId: string | null | undefined, sellerScope?: string | string[]): boolean {
  if (!sellerScope) return true;
  if (!sellerId) return false;
  const ids = Array.isArray(sellerScope) ? sellerScope : [sellerScope];
  return ids.includes(sellerId);
}

function asRelatedRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return (value[0] as Record<string, unknown>) || null;
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
}

async function enrichSellerGroupsWithTransport(
  supabase: NonNullable<ReturnType<typeof persistClient>>,
  groups: OrderSellerGroupDescriptor[]
): Promise<void> {
  if (groups.length === 0) return;

  const groupIds = groups.map((group) => group.id).filter(isUuid);
  let requestRows: Array<Record<string, unknown>> = [];

  if (groupIds.length > 0) {
    const byColumn = await supabase
      .from("transport_requests")
      .select("id, status, provider_id, seller_group_id, metadata, transport_services(title, origin_label, destination_label)")
      .in("seller_group_id", groupIds)
      .order("created_at", { ascending: false });

    if (!byColumn.error && byColumn.data) {
      requestRows = byColumn.data as Array<Record<string, unknown>>;
    } else {
      const orFilter = groupIds.map((id) => `metadata->>seller_group_id.eq.${id}`).join(",");
      const byMetadata = await supabase
        .from("transport_requests")
        .select("id, status, provider_id, metadata, transport_services(title, origin_label, destination_label)")
        .or(orFilter)
        .order("created_at", { ascending: false });
      if (!byMetadata.error && byMetadata.data) {
        requestRows = byMetadata.data as Array<Record<string, unknown>>;
      }
    }
  }

  const latestByGroup = new Map<string, Record<string, unknown>>();
  for (const row of requestRows) {
    const groupId = sellerGroupIdFromTransportRequestRow({
      seller_group_id: row.seller_group_id ? String(row.seller_group_id) : null,
      metadata: row.metadata,
    });
    if (!groupId || latestByGroup.has(groupId)) continue;
    latestByGroup.set(groupId, row);
  }

  const transporterIds = [
    ...groups.map((group) => group.transport_provider_id),
    ...[...latestByGroup.values()].map((row) => (row.provider_id ? String(row.provider_id) : null)),
  ].filter((id): id is string => Boolean(id && isUuid(id)));

  const transporterNames = await loadProviderNames(supabase, transporterIds);

  for (const group of groups) {
    const row = latestByGroup.get(group.id);
    if (row?.status) {
      group.transport_request_id = String(row.id);
      group.transport_status = mapTransportRequestStatusToOrderTransport(
        String(row.status) as "pending" | "accepted" | "rejected" | "cancelled" | "completed"
      );
      group.transport_provider_id = row.provider_id ? String(row.provider_id) : group.transport_provider_id || null;
    }
    if (group.transport_provider_id) {
      const transporter = transporterNames.get(group.transport_provider_id);
      group.transport_provider_name = transporter?.name || group.transport_provider_name || null;
      group.transport_provider_phone = transporter?.phone || group.transport_provider_phone || null;
    }
    if (row) {
      const service = asRelatedRecord(row.transport_services);
      group.transport_title = service?.title ? String(service.title) : group.transport_title || null;
      group.transport_origin = service?.origin_label ? String(service.origin_label) : group.transport_origin || null;
      group.transport_destination = service?.destination_label
        ? String(service.destination_label)
        : group.transport_destination || null;
    }
  }
}

async function assembleOrder(
  supabase: NonNullable<ReturnType<typeof persistClient>>,
  orderRow: Record<string, unknown>,
  sellerScope?: string | string[]
): Promise<OrderDescriptor> {
  const orderId = String(orderRow.id);
  const [{ data: groups }, { data: items }, { data: payments }, { data: customer }] = await Promise.all([
    supabase.from("order_seller_groups").select("*").eq("order_id", orderId),
    supabase.from("order_items").select("*").eq("order_id", orderId),
    supabase.from("payments").select("*").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1),
    supabase.from("profiles").select("id, display_name, email, phone").eq("id", String(orderRow.customer_id)).maybeSingle(),
  ]);

  const scopedGroups = ((groups || []) as any[]).filter((group: any) =>
    matchesSellerScope(group.seller_id, sellerScope)
  );
  const scopedGroupIds = new Set(scopedGroups.map((group: any) => group.id));
  const scopedItems = ((items || []) as any[]).filter((item: any) => {
    if (!sellerScope) return true;
    return (
      matchesSellerScope(item.seller_id, sellerScope) ||
      (item.seller_group_id && scopedGroupIds.has(item.seller_group_id))
    );
  });

  const sellerNames = await loadProviderNames(
    supabase,
    scopedGroups.map((group: any) => group.seller_id)
  );

  const mappedItems: OrderItemDescriptor[] = scopedItems.map((item: any) => ({
    id: item.id,
    order_id: item.order_id,
    product_id: item.product_id,
    seller_id: item.seller_id,
    product_title: item.product_title,
    product_slug: item.product_slug,
    sku: item.sku,
    unit: item.unit,
    quantity: asNumber(item.quantity),
    unit_price: asNumber(item.unit_price),
    subtotal: asNumber(item.subtotal),
    currency: item.currency || "AOA",
  }));

  const itemsByGroup = new Map<string, OrderItemDescriptor[]>();
  for (const item of mappedItems) {
    const groupId =
      scopedGroups.find((group: any) => group.id === ((items || []) as any[]).find((row: any) => row.id === item.id)?.seller_group_id)
        ?.id || scopedGroups.find((group: any) => group.seller_id === item.seller_id)?.id;
    if (!groupId) continue;
    const list = itemsByGroup.get(groupId) || [];
    list.push(item);
    itemsByGroup.set(groupId, list);
  }

  const snapshot = (orderRow.shipping_address_snapshot || null) as CheckoutOrderInput["shippingAddressSnapshot"] | null;
  const paymentRow = payments?.[0];
  const payment: PaymentRecordDescriptor | null = paymentRow
    ? {
        id: paymentRow.id,
        order_id: paymentRow.order_id,
        provider: paymentRow.provider,
        provider_payment_id: paymentRow.provider_payment_id,
        payment_method: paymentRow.payment_method,
        amount: asNumber(paymentRow.amount),
        currency: paymentRow.currency || "AOA",
        status: paymentRow.status,
        paid_at: paymentRow.paid_at,
        created_at: paymentRow.created_at,
      }
    : null;

  const sellerGroups: OrderSellerGroupDescriptor[] = scopedGroups.map((group: any) => {
    const seller = sellerNames.get(group.seller_id);
    return {
      id: group.id,
      order_id: group.order_id,
      seller_id: group.seller_id,
      seller_name: seller?.name || "Vendedor Agrícola",
      seller_slug: seller?.slug,
      status: group.status,
      delivery_status: group.delivery_status,
      fulfillment_method: group.fulfillment_method,
      courier_id: group.courier_id,
      delivery_otp: group.delivery_otp_plain,
      proof_of_delivery_type: group.proof_of_delivery_type,
      delivered_at: group.delivered_at,
      failed_reason: group.failed_reason,
      subtotal: asNumber(group.subtotal),
      delivery_fee: asNumber(group.delivery_fee),
      total: asNumber(group.total),
      seller_notes: group.seller_notes,
      transport_request_id: group.transport_request_id || null,
      transport_status: (group.transport_status as OrderTransportStatus | null) || null,
      transport_provider_id: group.transport_provider_id || null,
      items: itemsByGroup.get(group.id) || mappedItems.filter((item) => item.seller_id === group.seller_id),
    };
  });

  await enrichSellerGroupsWithTransport(supabase, sellerGroups);

  return {
    id: orderId,
    order_number: String(orderRow.order_number),
    customer_id: String(orderRow.customer_id),
    customer_name: customer?.display_name || snapshot?.recipient_name || undefined,
    customer_email: customer?.email || undefined,
    customer_phone: customer?.phone || snapshot?.phone || undefined,
    status: orderRow.status as OrderDescriptor["status"],
    payment_status: orderRow.payment_status as OrderDescriptor["payment_status"],
    fulfillment_method: orderRow.fulfillment_method as OrderDescriptor["fulfillment_method"],
    currency: String(orderRow.currency || "AOA"),
    subtotal: asNumber(orderRow.subtotal),
    delivery_fee: asNumber(orderRow.delivery_fee),
    discount: asNumber(orderRow.discount),
    tax: asNumber(orderRow.tax),
    total: asNumber(orderRow.total),
    shipping_address: mapAddressSnapshot(snapshot || undefined, String(orderRow.customer_id)),
    notes: (orderRow.notes as string | null) || null,
    cancelled_reason: (orderRow.cancelled_reason as string | null) || null,
    items: mappedItems,
    seller_groups: sellerGroups,
    payment,
    created_at: String(orderRow.created_at),
    updated_at: String(orderRow.updated_at),
  };
}

export async function persistCheckoutOrder(
  actor: CommercePersistActor,
  input: CheckoutOrderInput
): Promise<{ success: boolean; order: OrderDescriptor; paymentResult: Awaited<ReturnType<typeof PaymentService.createPayment>> } | null> {
  const supabase = persistClient();
  if (!supabase) return null;

  const cart = await persistGetCart(actor.customerId);
  if (!cart || cart.items.length === 0) {
    throw new Error("O seu carrinho está vazio.");
  }

  const pricedItems: Array<{
    cartItem: CartItemDescriptor;
    unitPrice: number;
    sellerId: string;
    title: string;
    slug: string;
    unit: string;
    sku?: string | null;
    quantity: number;
    subtotal: number;
    currency: string;
  }> = [];

  for (const item of cart.items) {
    const product = await resolveCatalogProduct(item.product_id);
    if (!product || !isUuid(product.id)) {
      throw new Error(`O produto "${item.title}" já não está disponível.`);
    }
    if (product.availability_status === "out_of_stock") {
      throw new Error(`O produto "${item.title}" já não está disponível em stock.`);
    }
    if (product.quantity && item.quantity > product.quantity) {
      throw new Error(`Apenas ${product.quantity} ${product.unit} disponíveis em stock.`);
    }
    if (!isUuid(product.seller_id)) {
      throw new Error(`O produto "${item.title}" já não está disponível.`);
    }
    const unitPrice = product.price;
    pricedItems.push({
      cartItem: item,
      unitPrice,
      sellerId: product.seller_id,
      title: product.title,
      slug: product.slug,
      unit: product.unit,
      sku: product.sku,
      quantity: item.quantity,
      subtotal: unitPrice * item.quantity,
      currency: product.currency || "AOA",
    });
  }

  const subtotal = pricedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryFee =
    input.fulfillmentMethod === "delivery"
      ? calculateDeliveryFee(input.shippingAddressSnapshot?.province_name).fee
      : 0;
  const discount = 0;
  const tax = 0;
  const total = subtotal + deliveryFee - discount;

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: actor.customerId,
      status: "pending_payment" satisfies OrderStatus,
      payment_status: "pending" satisfies PaymentStatus,
      fulfillment_method: input.fulfillmentMethod,
      currency: cart.currency,
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      tax,
      total,
      shipping_address_snapshot: input.shippingAddressSnapshot || null,
      notes: input.notes || null,
    })
    .select("*")
    .single();

  if (orderError || !orderRow) {
    throw new Error(orderError?.message || "Não foi possível criar o pedido.");
  }

  const bySeller = new Map<string, typeof pricedItems>();
  for (const item of pricedItems) {
    const list = bySeller.get(item.sellerId) || [];
    list.push(item);
    bySeller.set(item.sellerId, list);
  }

  const groupIds = new Map<string, string>();
  for (const [sellerId, sellerItems] of bySeller.entries()) {
    const sellerSubtotal = sellerItems.reduce((sum, item) => sum + item.subtotal, 0);
    const otp = generateDeliveryOTP();
    const { data: group, error: groupError } = await supabase
      .from("order_seller_groups")
      .insert({
        order_id: orderRow.id,
        seller_id: sellerId,
        status: "processing",
        fulfillment_method: input.fulfillmentMethod,
        delivery_status: "not_assigned",
        subtotal: sellerSubtotal,
        delivery_fee: 0,
        total: sellerSubtotal,
        delivery_otp_plain: otp,
        delivery_otp_hash: createHash("sha256").update(otp).digest("hex"),
      })
      .select("id")
      .single();
    if (groupError || !group?.id) {
      throw new Error(groupError?.message || "Não foi possível agrupar o pedido por vendedor.");
    }
    groupIds.set(sellerId, group.id);
  }

  const itemRows = pricedItems.map((item) => ({
    order_id: orderRow.id,
    seller_group_id: groupIds.get(item.sellerId) || null,
    product_id: item.cartItem.product_id,
    seller_id: item.sellerId,
    product_title: item.title,
    product_slug: item.slug,
    sku: item.sku || null,
    unit: item.unit,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    subtotal: item.subtotal,
    currency: item.currency,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(itemRows);
  if (itemsError) throw new Error(itemsError.message);

  const paymentResult = await PaymentService.createPayment({
    orderId: orderRow.id,
    orderNumber: orderRow.order_number,
    amount: total,
    currency: cart.currency,
    paymentMethod: input.paymentMethod || "mock_sandbox",
    customerName: actor.customerName || input.shippingAddressSnapshot?.recipient_name,
    customerEmail: actor.customerEmail || undefined,
    customerPhone: actor.customerPhone || input.shippingAddressSnapshot?.phone,
  });

  const orderStatus: OrderStatus = paymentResult.status === "paid" ? "paid" : "pending_payment";
  const paymentStatus: PaymentStatus = paymentResult.status;

  const { error: paymentError } = await supabase.from("payments").insert({
    order_id: orderRow.id,
    provider: paymentResult.provider,
    provider_payment_id: paymentResult.providerPaymentId || null,
    payment_method: input.paymentMethod || "mock_sandbox",
    amount: total,
    currency: cart.currency,
    status: paymentStatus,
    paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
    metadata: { instructions: paymentResult.instructions || null },
  });
  if (paymentError) throw new Error(paymentError.message);

  const { error: statusError } = await supabase
    .from("orders")
    .update({ status: orderStatus, payment_status: paymentStatus })
    .eq("id", orderRow.id);
  if (statusError) throw new Error(statusError.message);

  await supabase.from("carts").update({ status: "converted" }).eq("id", cart.id);

  if (paymentStatus === "paid") {
    for (const item of pricedItems) {
      const product = await resolveCatalogProduct(item.cartItem.product_id);
      const remaining = Math.max(0, (product?.quantity || 0) - item.quantity);
      await ShoppingService.updateInventory(item.cartItem.product_id, item.sellerId, {
        quantity: remaining,
      });
    }
  }

  const fresh = await supabase.from("orders").select("*").eq("id", orderRow.id).single();
  if (fresh.error || !fresh.data) {
    throw new Error(fresh.error?.message || "Pedido criado mas não foi possível relê-lo.");
  }

  const order = await assembleOrder(supabase, fresh.data as Record<string, unknown>);
  return { success: true, order, paymentResult };
}

export async function persistGetOrderByNumber(
  orderNumber: string,
  scope?: { customerId?: string; sellerId?: string | string[] }
): Promise<OrderDescriptor | null> {
  const supabase = persistClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const sellerIds = Array.isArray(scope?.sellerId)
    ? scope.sellerId.filter(Boolean)
    : scope?.sellerId
      ? [scope.sellerId]
      : [];
  const hasSellerScope = sellerIds.length > 0;
  const isCustomerOwner = Boolean(scope?.customerId && data.customer_id === scope.customerId);
  if (scope?.customerId && !isCustomerOwner && !hasSellerScope) {
    return null;
  }
  const order = await assembleOrder(
    supabase,
    data as Record<string, unknown>,
    isCustomerOwner ? undefined : hasSellerScope ? sellerIds : undefined
  );
  if (!isCustomerOwner && hasSellerScope && order.seller_groups.length === 0) return null;
  if (scope?.customerId && order.customer_id !== scope.customerId && !hasSellerScope) return null;
  return order;
}

export async function persistGetCustomerOrders(customerId: string): Promise<OrderDescriptor[] | null> {
  const supabase = persistClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const orders = await Promise.all(
    (data || []).map((row: any) => assembleOrder(supabase, row as Record<string, unknown>))
  );
  return orders;
}

export async function persistGetSellerOrders(sellerId: string | string[]): Promise<OrderDescriptor[] | null> {
  const supabase = persistClient();
  if (!supabase) return null;
  const sellerIds = (Array.isArray(sellerId) ? sellerId : [sellerId]).filter(Boolean);
  if (sellerIds.length === 0) return [];

  const [{ data: groups, error }, { data: itemRows, error: itemsError }] = await Promise.all([
    supabase.from("order_seller_groups").select("order_id").in("seller_id", sellerIds),
    supabase.from("order_items").select("order_id").in("seller_id", sellerIds),
  ]);
  if (error) throw new Error(error.message);
  if (itemsError) throw new Error(itemsError.message);

  const orderIds = [
    ...new Set(
      [...(groups || []), ...(itemRows || [])]
        .map((row: { order_id?: string }) => row.order_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  if (orderIds.length === 0) return [];
  const { data, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .in("id", orderIds)
    .order("created_at", { ascending: false });
  if (ordersError) throw new Error(ordersError.message);
  return Promise.all(
    (data || []).map((row: Record<string, unknown>) =>
      assembleOrder(supabase, row as Record<string, unknown>, sellerIds)
    )
  );
}

export async function persistUpdateFulfillmentStatus(
  orderNumber: string,
  sellerId: string,
  nextStatus: OrderSellerGroupDescriptor["status"]
): Promise<boolean | null> {
  const supabase = persistClient();
  if (!supabase) return null;
  const order = await persistGetOrderByNumber(orderNumber, { sellerId });
  if (!order) return false;
  const group = order.seller_groups.find((entry) => entry.seller_id === sellerId);
  if (!group) return false;
  const { error } = await supabase
    .from("order_seller_groups")
    .update({ status: nextStatus })
    .eq("id", group.id)
    .eq("seller_id", sellerId);
  if (error) throw new Error(error.message);
  if (nextStatus === "completed") {
    const remaining = order.seller_groups.filter((entry) => entry.seller_id !== sellerId && entry.status !== "completed");
    if (remaining.length === 0) {
      await supabase.from("orders").update({ status: "completed" }).eq("id", order.id);
    }
  }
  return true;
}

export async function persistFindActiveOrderTransportRequest(
  sellerGroupId: string
): Promise<{ id: string; status: string; provider_id: string } | null> {
  const supabase = persistClient();
  if (!supabase) return null;
  if (!isUuid(sellerGroupId)) return null;

  const byColumn = await supabase
    .from("transport_requests")
    .select("id, status, provider_id")
    .eq("seller_group_id", sellerGroupId)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!byColumn.error && byColumn.data?.id) {
    return {
      id: String(byColumn.data.id),
      status: String(byColumn.data.status),
      provider_id: String(byColumn.data.provider_id),
    };
  }

  if (byColumn.error && !isMissingSchemaError(byColumn.error)) {
    throw new Error("Não foi possível verificar pedidos de transporte ativos.");
  }

  const byMetadata = await supabase
    .from("transport_requests")
    .select("id, status, provider_id, metadata")
    .in("status", ["pending", "accepted"])
    .contains("metadata", { seller_group_id: sellerGroupId })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (byMetadata.error) {
    if (isMissingSchemaError(byMetadata.error)) return null;
    throw new Error("Não foi possível verificar pedidos de transporte ativos.");
  }
  if (!byMetadata.data?.id) return null;
  return {
    id: String(byMetadata.data.id),
    status: String(byMetadata.data.status),
    provider_id: String(byMetadata.data.provider_id),
  };
}

export async function persistLinkSellerGroupTransport(params: {
  sellerGroupId: string;
  sellerIds: string[];
  transportRequestId: string;
  transportStatus: OrderTransportStatus;
  transportProviderId: string;
}): Promise<boolean | null> {
  const supabase = persistClient();
  if (!supabase) return null;
  const sellerIds = params.sellerIds.filter(isUuid);
  if (!isUuid(params.sellerGroupId) || sellerIds.length === 0) return false;
  const { data, error } = await supabase
    .from("order_seller_groups")
    .update({
      transport_request_id: params.transportRequestId,
      transport_status: params.transportStatus,
      transport_provider_id: params.transportProviderId,
    })
    .eq("id", params.sellerGroupId)
    .in("seller_id", sellerIds)
    .select("id")
    .maybeSingle();
  if (error) {
    if (isMissingSchemaError(error)) return true;
    throw new Error("Não foi possível associar o transporte à encomenda.");
  }
  return Boolean(data?.id);
}

export async function persistUpdateTransportRequestStatus(params: {
  requestId: string;
  fromStatus: string;
  toStatus: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = persistClient();
  if (!supabase) return { ok: false, error: "persist_unavailable" };
  if (!isUuid(params.requestId)) return { ok: false, error: "invalid_id" };

  const { data, error } = await supabase
    .from("transport_requests")
    .update({ status: params.toStatus })
    .eq("id", params.requestId)
    .eq("status", params.fromStatus)
    .select("id")
    .maybeSingle();

  if (!error && data?.id) return { ok: true };

  if (error) {
    console.warn("[persistUpdateTransportRequestStatus]", error);
  }

  const current = await supabase
    .from("transport_requests")
    .select("id, status")
    .eq("id", params.requestId)
    .maybeSingle();

  if (!current.error && current.data && String(current.data.status) === params.toStatus) {
    return { ok: true };
  }

  return {
    ok: false,
    error: String(error?.message || current.error?.message || "update_failed"),
  };
}

export async function persistSyncSellerGroupTransport(params: {
  sellerGroupId: string;
  transportRequestId: string;
  transportStatus: OrderTransportStatus;
  transportProviderId?: string | null;
  fulfillmentStatus?: OrderSellerGroupDescriptor["status"];
}): Promise<boolean | null> {
  const supabase = persistClient();
  if (!supabase) return null;
  if (!isUuid(params.sellerGroupId)) return false;
  const patch: Record<string, unknown> = {
    transport_request_id: params.transportRequestId,
    transport_status: params.transportStatus,
  };
  if (params.transportProviderId) {
    patch.transport_provider_id = params.transportProviderId;
  }
  if (params.fulfillmentStatus) {
    patch.status = params.fulfillmentStatus;
  }
  const { data, error } = await supabase
    .from("order_seller_groups")
    .update(patch)
    .eq("id", params.sellerGroupId)
    .select("id, status")
    .maybeSingle();
  if (error) {
    if (isMissingSchemaError(error) && params.fulfillmentStatus) {
      const shipped = await supabase
        .from("order_seller_groups")
        .update({ status: params.fulfillmentStatus })
        .eq("id", params.sellerGroupId)
        .select("id")
        .maybeSingle();
      if (shipped.error) {
        throw new Error("Não foi possível atualizar a encomenda.");
      }
      return Boolean(shipped.data?.id);
    }
    if (isMissingSchemaError(error)) return true;
    throw new Error("Não foi possível atualizar o transporte da encomenda.");
  }
  return Boolean(data?.id);
}

export async function persistGetSellerGroupById(
  sellerGroupId: string
): Promise<{
  id: string;
  order_id: string;
  seller_id: string;
  status: OrderSellerGroupDescriptor["status"];
  transport_status: OrderTransportStatus | null;
} | null> {
  const supabase = persistClient();
  if (!supabase) return null;
  if (!isUuid(sellerGroupId)) return null;
  const { data, error } = await supabase
    .from("order_seller_groups")
    .select("id, order_id, seller_id, status, transport_status")
    .eq("id", sellerGroupId)
    .maybeSingle();
  if (error && isMissingSchemaError(error)) {
    const fallback = await supabase
      .from("order_seller_groups")
      .select("id, order_id, seller_id, status")
      .eq("id", sellerGroupId)
      .maybeSingle();
    if (fallback.error || !fallback.data?.id) return null;
    return {
      id: String(fallback.data.id),
      order_id: String(fallback.data.order_id),
      seller_id: String(fallback.data.seller_id),
      status: fallback.data.status as OrderSellerGroupDescriptor["status"],
      transport_status: null,
    };
  }
  if (error) throw new Error("Não foi possível ler o grupo da encomenda.");
  if (!data?.id) return null;
  return {
    id: String(data.id),
    order_id: String(data.order_id),
    seller_id: String(data.seller_id),
    status: data.status as OrderSellerGroupDescriptor["status"],
    transport_status: (data.transport_status as OrderTransportStatus | null) || null,
  };
}

export async function persistCancelOrder(
  orderNumber: string,
  customerId: string,
  reason?: string
): Promise<boolean | null> {
  const supabase = persistClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("orders")
    .select("id, status, customer_id")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.customer_id !== customerId) return false;
  if (data.status === "completed") {
    throw new Error("Não é possível cancelar um pedido já concluído.");
  }
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_reason: reason || "Cancelado pelo cliente",
    })
    .eq("id", data.id)
    .eq("customer_id", customerId);
  if (updateError) throw new Error(updateError.message);
  return true;
}

export async function persistGetSellerEarnings(
  sellerId: string | string[]
): Promise<SellerEarningsSummary | null> {
  const sellerIds = (Array.isArray(sellerId) ? sellerId : [sellerId]).filter(Boolean);
  const orders = await persistGetSellerOrders(sellerIds);
  if (orders === null) return null;
  return summarizeSellerEarnings(sellerIds, orders);
}

export function sellerGroupProductValue(group: {
  subtotal?: number;
  total?: number;
  items?: Array<{ subtotal?: number }>;
}): number {
  if (Array.isArray(group.items) && group.items.length > 0) {
    return group.items.reduce((sum, item) => sum + asNumber(item.subtotal), 0);
  }
  if (group.subtotal != null) return asNumber(group.subtotal);
  return asNumber(group.total);
}

export function isCompletedPaidProductGroup(params: {
  paymentStatus?: string | null;
  fulfillmentStatus?: string | null;
}): boolean {
  return params.paymentStatus === "paid" && params.fulfillmentStatus === "completed";
}

export function summarizeSellerEarnings(
  sellerId: string | string[],
  orders: OrderDescriptor[]
): SellerEarningsSummary {
  const sellerIds = (Array.isArray(sellerId) ? sellerId : [sellerId]).filter(Boolean);
  const allowed = new Set(sellerIds);

  const groups = orders.flatMap((order) =>
    order.seller_groups
      .filter((group) => allowed.has(group.seller_id))
      .map((group) => ({
        order_number: order.order_number,
        status: group.status,
        payment_status: order.payment_status,
        total: sellerGroupProductValue(group),
        created_at: order.created_at,
      }))
  );

  const countable = groups.filter(
    (group) => group.payment_status === "paid" && group.status !== "cancelled"
  );
  const completed = countable.filter((group) =>
    isCompletedPaidProductGroup({
      paymentStatus: group.payment_status,
      fulfillmentStatus: group.status,
    })
  );
  const processing = countable.filter((group) => group.status !== "completed");

  return {
    seller_id: sellerIds[0] || "",
    currency: orders[0]?.currency || "AOA",
    total_earned: completed.reduce((sum, group) => sum + group.total, 0),
    total_processing: processing.reduce((sum, group) => sum + group.total, 0),
    completed_count: completed.length,
    processing_count: processing.length,
    entries: groups,
  };
}

export async function persistApplyPaymentWebhook(params: {
  eventId: string;
  eventType: string;
  provider: string;
  orderId?: string;
  providerPaymentId?: string;
  status?: PaymentStatus;
  amount?: number;
  payloadHash: string;
}): Promise<{ applied: boolean }> {
  const supabase = persistClient();
  if (!supabase) return { applied: false };

  const { error: eventError } = await supabase.from("payment_events").insert({
    provider: params.provider,
    provider_event_id: params.eventId,
    event_type: params.eventType,
    payload_hash: params.payloadHash,
    processed: false,
    metadata: {
      orderId: params.orderId || null,
      providerPaymentId: params.providerPaymentId || null,
    },
  });

  if (eventError && !/duplicate|unique/i.test(eventError.message)) {
    throw new Error(eventError.message);
  }
  if (eventError) {
    return { applied: true };
  }

  let paymentQuery = supabase.from("payments").select("id, order_id").limit(1);
  if (params.providerPaymentId) {
    paymentQuery = paymentQuery.eq("provider_payment_id", params.providerPaymentId);
  } else if (params.orderId) {
    paymentQuery = paymentQuery.eq("order_id", params.orderId);
  } else {
    return { applied: false };
  }

  const { data: payment } = await paymentQuery.maybeSingle();
  if (!payment?.id) return { applied: false };

  const nextStatus = params.status || "paid";
  await supabase
    .from("payments")
    .update({
      status: nextStatus,
      paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", payment.id);

  const orderStatus: OrderStatus = nextStatus === "paid" ? "paid" : nextStatus === "failed" ? "failed" : "pending_payment";
  await supabase
    .from("orders")
    .update({
      payment_status: nextStatus,
      status: orderStatus,
    })
    .eq("id", payment.order_id);

  await supabase.from("payment_events").update({ processed: true }).eq("provider_event_id", params.eventId);
  return { applied: true };
}

export async function persistRecordTrackingEvent(event: {
  orderId: string;
  orderNumber: string;
  sellerGroupId?: string;
  status: string;
  title: string;
  description: string;
  actorName?: string;
  actorType: "customer" | "seller" | "courier" | "logistics_admin" | "system";
  locationName?: string;
  latitude?: number;
  longitude?: number;
}): Promise<boolean> {
  const supabase = persistClient();
  if (!supabase || !isUuid(event.orderId)) return false;
  const { error } = await supabase.from("order_tracking_events").insert({
    order_id: event.orderId,
    order_number: event.orderNumber,
    seller_group_id: event.sellerGroupId && isUuid(event.sellerGroupId) ? event.sellerGroupId : null,
    status: event.status,
    title: event.title,
    description: event.description,
    actor_name: event.actorName || null,
    actor_type: event.actorType,
    location_name: event.locationName || null,
    latitude: event.latitude ?? null,
    longitude: event.longitude ?? null,
  });
  if (error) throw new Error(error.message);
  return true;
}

export async function persistGetTrackingEvents(orderNumber: string) {
  const supabase = persistClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("order_tracking_events")
    .select("*")
    .eq("order_number", orderNumber)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (!data) return [];
  return data.map((row: any) => ({
    id: row.id,
    order_id: row.order_id,
    order_number: row.order_number,
    seller_group_id: row.seller_group_id,
    status: row.status,
    title: row.title,
    description: row.description,
    actor_name: row.actor_name,
    actor_type: row.actor_type,
    location_name: row.location_name,
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    created_at: row.created_at,
  }));
}

export async function persistListNotifications(profileId: string) {
  const supabase = persistClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => {
    const payload = (row.data || {}) as Record<string, unknown>;
    return {
      id: row.id,
      profile_id: row.profile_id,
      type: row.type,
      title: row.title,
      message: row.message,
      read: Boolean(row.read_at),
      link_url: typeof payload.link_url === "string" ? payload.link_url : undefined,
      data: payload,
      created_at: row.created_at,
    };
  });
}

export async function persistCreateNotification(input: {
  profileId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
  data?: Record<string, unknown>;
}) {
  const supabase = persistClient();
  if (!supabase || !isUuid(input.profileId)) return null;
  const payload = { ...(input.data || {}), link_url: input.linkUrl || null };
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      profile_id: input.profileId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: payload,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    profile_id: data.profile_id,
    type: data.type,
    title: data.title,
    message: data.message,
    read: false,
    link_url: input.linkUrl,
    data: payload,
    created_at: data.created_at,
  };
}

export async function persistMarkNotificationRead(notificationId: string, profileId: string) {
  const supabase = persistClient();
  if (!supabase || !isUuid(notificationId)) return null;
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("profile_id", profileId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}

export async function persistMarkAllNotificationsRead(profileId: string) {
  const supabase = persistClient();
  if (!supabase) return null;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return true;
}
