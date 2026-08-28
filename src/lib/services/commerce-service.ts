import { PaymentService } from "@/lib/payments";
import { INITIAL_PRODUCTS, ShoppingService } from "@/lib/services/shopping-service";
import { calculateDeliveryFee } from "@/lib/logistics/delivery-fee";
import { LogisticsService } from "@/lib/services/logistics-service";
import { NotificationService } from "@/lib/services/notification-service";
import { isUuid } from "@/lib/commerce/ids";
import {
  persistAddToCart,
  persistCancelOrder,
  persistCheckoutOrder,
  persistClearCart,
  persistGetCart,
  persistGetCustomerOrders,
  persistGetOrderByNumber,
  persistGetSellerEarnings,
  persistGetSellerOrders,
  persistRemoveFromCart,
  persistUpdateCartItemQuantity,
  persistUpdateFulfillmentStatus,
  persistRecordTrackingEvent,
  summarizeSellerEarnings,
} from "@/lib/commerce/persist";
import type {
  ShoppingCart,
  CartItemDescriptor,
  CheckoutOrderInput,
  AddToCartInput,
  CommerceActor,
  OrderDescriptor,
  OrderItemDescriptor,
  OrderSellerGroupDescriptor,
  SellerEarningsSummary,
} from "@/types/commerce";
import type { OrderStatus, PaymentStatus } from "@/types/database";

export type { AddToCartInput, CheckoutOrderInput, CommerceActor };

const DEFAULT_MEMORY_CUSTOMER = "demo-user";

function cloneOrders(orders: OrderDescriptor[]): OrderDescriptor[] {
  return JSON.parse(JSON.stringify(orders)) as OrderDescriptor[];
}

function emptyCart(customerId: string): ShoppingCart {
  return {
    id: `cart-${customerId}`,
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

export const INITIAL_ORDERS: OrderDescriptor[] = [
  {
    id: "ord-seed-1",
    order_number: "AGC-2026-000001",
    customer_id: "cust-demo-1",
    customer_name: "Mateus Silva",
    customer_email: "mateus@agrokwanza.ao",
    customer_phone: "+244 923 888 777",
    status: "paid",
    payment_status: "paid",
    fulfillment_method: "delivery",
    currency: "AOA",
    subtotal: 57000,
    delivery_fee: 0,
    discount: 0,
    tax: 0,
    total: 57000,
    notes: "Entregar no armazém da fazenda em Caála",
    shipping_address: {
      id: "addr-1",
      profile_id: "cust-demo-1",
      label: "Fazenda Caála",
      recipient_name: "Mateus Silva",
      phone: "+244 923 888 777",
      province_name: "Huambo",
      municipality_name: "Caála",
      address_line: "Estrada Nacional 260, km 14",
      is_default: true,
      created_at: new Date().toISOString(),
    },
    items: [
      {
        id: "item-1",
        order_id: "ord-seed-1",
        product_id: "prd-seed-1",
        seller_id: "prov-seed-1",
        product_title: "Semente de Milho Híbrido Certificada ZM-521 (25kg)",
        product_slug: "semente-milho-hibrido-zm521-25kg",
        sku: "SEM-MIL-521",
        unit: "saco 25kg",
        quantity: 2,
        unit_price: 28500,
        subtotal: 57000,
        currency: "AOA",
      },
    ],
    seller_groups: [
      {
        id: "grp-1",
        order_id: "ord-seed-1",
        seller_id: "prov-seed-1",
        seller_name: "Dr. João Silva • Veterinária & Pecuária",
        seller_slug: "dr-joao-silva",
        status: "processing",
        delivery_status: "assigned",
        fulfillment_method: "delivery",
        courier_name: "Expresso Rural Huambo",
        courier_phone: "+244 923 555 444",
        delivery_otp: "483921",
        subtotal: 57000,
        delivery_fee: 0,
        total: 57000,
        items: [
          {
            id: "item-1",
            order_id: "ord-seed-1",
            product_id: "prd-seed-1",
            seller_id: "prov-seed-1",
            product_title: "Semente de Milho Híbrido Certificada ZM-521 (25kg)",
            product_slug: "semente-milho-hibrido-zm521-25kg",
            sku: "SEM-MIL-521",
            unit: "saco 25kg",
            quantity: 2,
            unit_price: 28500,
            subtotal: 57000,
            currency: "AOA",
          },
        ],
      },
    ],
    payment: {
      id: "pay-1",
      order_id: "ord-seed-1",
      provider: "sandbox_mock",
      provider_payment_id: "sbx_pay_001",
      payment_method: "mock_sandbox",
      amount: 57000,
      currency: "AOA",
      status: "paid",
      paid_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const memoryCarts = new Map<string, ShoppingCart>();
let memoryOrders: OrderDescriptor[] = cloneOrders(INITIAL_ORDERS);
let orderSeq = 2;

function customerKey(actor?: CommerceActor): string {
  return actor?.customerId || DEFAULT_MEMORY_CUSTOMER;
}

function hasPersistableActorId(actor?: CommerceActor): boolean {
  if (actor?.customerId && isUuid(actor.customerId)) return true;
  const sellerIds = Array.isArray(actor?.sellerId)
    ? actor.sellerId
    : actor?.sellerId
      ? [actor.sellerId]
      : [];
  return sellerIds.some((id) => isUuid(id));
}

function shouldPersist(actor?: CommerceActor): boolean {
  if (process.env.VITEST || process.env.VITEST_WORKER_ID) return false;
  return Boolean(actor?.persist && hasPersistableActorId(actor));
}

export function recalculateCart(items: CartItemDescriptor[], customerId = DEFAULT_MEMORY_CUSTOMER): ShoppingCart {
  const sellers = new Set(items.map((item) => item.seller_id));
  const subtotal = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const existing = memoryCarts.get(customerId);
  return {
    id: existing?.id || `cart-${customerId}`,
    customer_id: customerId,
    currency: "AOA",
    items,
    items_count: items.reduce((acc, item) => acc + item.quantity, 0),
    subtotal,
    delivery_fee: 0,
    discount: 0,
    total: subtotal,
    sellers_count: sellers.size,
  };
}

function memoryGetCart(customerId: string): ShoppingCart {
  const existing = memoryCarts.get(customerId);
  if (existing) return existing;
  const created = emptyCart(customerId);
  memoryCarts.set(customerId, created);
  return created;
}

function memorySetCart(customerId: string, cart: ShoppingCart): ShoppingCart {
  memoryCarts.set(customerId, cart);
  return cart;
}

async function resolveProduct(productId: string) {
  const byId = await ShoppingService.getProductById(productId);
  if (byId) return byId;
  const bySlug = await ShoppingService.getProductBySlug(productId);
  if (bySlug) return bySlug;
  return INITIAL_PRODUCTS.find((product) => product.id === productId || product.slug === productId) || null;
}

export class CommerceService {
  public static resetMemoryStore(): void {
    memoryCarts.clear();
    memoryOrders = cloneOrders(INITIAL_ORDERS);
    orderSeq = 2;
  }

  public static async getCart(actor?: CommerceActor): Promise<ShoppingCart> {
    if (shouldPersist(actor) && actor?.customerId) {
      const persisted = await persistGetCart(actor.customerId);
      if (persisted) return persisted;
    }
    return memoryGetCart(customerKey(actor));
  }

  public static async addToCart(input: AddToCartInput, actor?: CommerceActor): Promise<ShoppingCart> {
    if (shouldPersist(actor) && actor?.customerId) {
      const persisted = await persistAddToCart(
        actor.customerId,
        input.productId,
        input.quantity && input.quantity > 0 ? input.quantity : 1
      );
      if (persisted) return persisted;
    }

    const product = await resolveProduct(input.productId);
    if (!product) {
      throw new Error("Produto não encontrado.");
    }
    if (product.availability_status === "out_of_stock") {
      throw new Error("Este produto encontra-se temporariamente sem stock.");
    }

    const customerId = customerKey(actor);
    const cart = memoryGetCart(customerId);
    const qtyToAdd = input.quantity && input.quantity > 0 ? input.quantity : 1;
    const existingIndex = cart.items.findIndex((item) => item.product_id === product.id);
    const updatedItems = [...cart.items];

    if (existingIndex >= 0) {
      const existing = updatedItems[existingIndex];
      const nextQty = existing.quantity + qtyToAdd;
      if (product.quantity && nextQty > product.quantity) {
        throw new Error(`Apenas ${product.quantity} ${product.unit} disponíveis em stock.`);
      }
      updatedItems[existingIndex] = {
        ...existing,
        quantity: nextQty,
        unit_price: product.price,
        subtotal: nextQty * product.price,
      };
    } else {
      updatedItems.push({
        id: `ci-${Math.random().toString(36).substring(2, 8)}`,
        product_id: product.id,
        seller_id: product.seller_id,
        seller_name: product.seller_name,
        seller_slug: product.seller_slug,
        title: product.title,
        slug: product.slug,
        unit_price: product.price,
        quantity: qtyToAdd,
        unit: product.unit,
        subtotal: qtyToAdd * product.price,
        currency: product.currency,
        max_available_quantity: product.quantity,
        is_available: true,
        image_url: product.image_url,
      });
    }

    return memorySetCart(customerId, recalculateCart(updatedItems, customerId));
  }

  public static async updateCartItemQuantity(
    productId: string,
    quantity: number,
    actor?: CommerceActor
  ): Promise<ShoppingCart> {
    if (quantity <= 0) {
      return this.removeFromCart(productId, actor);
    }

    if (shouldPersist(actor) && actor?.customerId) {
      const persisted = await persistUpdateCartItemQuantity(actor.customerId, productId, quantity);
      if (persisted) return persisted;
    }

    const customerId = customerKey(actor);
    const cart = memoryGetCart(customerId);
    const product = await resolveProduct(productId);
    if (product && product.quantity && quantity > product.quantity) {
      throw new Error(`Apenas ${product.quantity} ${product.unit} disponíveis em stock.`);
    }

    const unitPrice = product?.price;
    const updatedItems = cart.items.map((item) => {
      if (item.product_id === productId || item.slug === productId) {
        const nextPrice = unitPrice ?? item.unit_price;
        return {
          ...item,
          quantity,
          unit_price: nextPrice,
          subtotal: quantity * nextPrice,
        };
      }
      return item;
    });

    return memorySetCart(customerId, recalculateCart(updatedItems, customerId));
  }

  public static async removeFromCart(productId: string, actor?: CommerceActor): Promise<ShoppingCart> {
    if (shouldPersist(actor) && actor?.customerId) {
      const persisted = await persistRemoveFromCart(actor.customerId, productId);
      if (persisted) return persisted;
    }
    const customerId = customerKey(actor);
    const cart = memoryGetCart(customerId);
    const updatedItems = cart.items.filter(
      (item) => item.product_id !== productId && item.slug !== productId
    );
    return memorySetCart(customerId, recalculateCart(updatedItems, customerId));
  }

  public static async clearCart(actor?: CommerceActor): Promise<ShoppingCart> {
    if (shouldPersist(actor) && actor?.customerId) {
      const persisted = await persistClearCart(actor.customerId);
      if (persisted) return persisted;
    }
    const customerId = customerKey(actor);
    return memorySetCart(customerId, recalculateCart([], customerId));
  }

  public static async checkoutOrder(
    input: CheckoutOrderInput,
    actor?: CommerceActor
  ): Promise<{
    success: boolean;
    order: OrderDescriptor;
    paymentResult: Awaited<ReturnType<typeof PaymentService.createPayment>>;
  }> {
    if (shouldPersist(actor) && actor?.customerId) {
      const persisted = await persistCheckoutOrder(
        { customerId: actor.customerId },
        input
      );
      if (persisted) {
        await persistRecordTrackingEvent({
          orderId: persisted.order.id,
          orderNumber: persisted.order.order_number,
          status: persisted.order.payment_status,
          title: persisted.order.payment_status === "paid" ? "Pagamento Confirmado" : "Pedido criado",
          description:
            persisted.order.payment_status === "paid"
              ? `Pagamento de ${persisted.order.total} ${persisted.order.currency} confirmado.`
              : "Pedido registado. Aguardando pagamento.",
          actorType: "system",
        }).catch(() => false);
        await NotificationService.createNotification(
          {
            profileId: actor.customerId,
            type: persisted.order.payment_status === "paid" ? "order.paid" : "order.created",
            title: persisted.order.payment_status === "paid" ? "Pagamento Confirmado" : "Pedido criado",
            message: `O seu pedido #${persisted.order.order_number} foi registado.`,
            linkUrl: `/orders/${persisted.order.order_number}`,
          },
          { persist: true }
        ).catch(() => null);
        return persisted;
      }
    }

    const customerId = customerKey(actor);
    const cart = memoryGetCart(customerId);
    if (cart.items.length === 0) {
      throw new Error("O seu carrinho está vazio.");
    }

    const pricedItems: OrderItemDescriptor[] = [];
    for (const item of cart.items) {
      const freshProduct = await resolveProduct(item.product_id);
      if (!freshProduct) {
        throw new Error(`O produto "${item.title}" já não está disponível.`);
      }
      if (freshProduct.availability_status === "out_of_stock") {
        throw new Error(`O produto "${item.title}" já não está disponível em stock.`);
      }
      const unitPrice = freshProduct.price;
      pricedItems.push({
        id: `oi-${Math.random().toString(36).substring(2, 8)}`,
        order_id: "",
        product_id: freshProduct.id,
        seller_id: freshProduct.seller_id,
        product_title: freshProduct.title,
        product_slug: freshProduct.slug,
        sku: freshProduct.sku,
        unit: freshProduct.unit,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: unitPrice * item.quantity,
        currency: freshProduct.currency,
      });
    }

    const year = new Date().getFullYear();
    const orderNumber = `AGC-${year}-${String(orderSeq++).padStart(6, "0")}`;
    const orderId = `ord-${Math.random().toString(36).substring(2, 9)}`;
    pricedItems.forEach((item) => {
      item.order_id = orderId;
    });

    const sellerGroupMap = new Map<string, OrderItemDescriptor[]>();
    pricedItems.forEach((item) => {
      const list = sellerGroupMap.get(item.seller_id) || [];
      list.push(item);
      sellerGroupMap.set(item.seller_id, list);
    });

    const deliveryFee =
      input.fulfillmentMethod === "delivery"
        ? calculateDeliveryFee(input.shippingAddressSnapshot?.province_name).fee
        : 0;
    const subtotal = pricedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal + deliveryFee;

    const sellerGroups: OrderSellerGroupDescriptor[] = [];
    sellerGroupMap.forEach((items, sellerId) => {
      const sellerItem = cart.items.find((entry) => entry.seller_id === sellerId);
      const sub = items.reduce((acc, item) => acc + item.subtotal, 0);
      sellerGroups.push({
        id: `osg-${Math.random().toString(36).substring(2, 8)}`,
        order_id: orderId,
        seller_id: sellerId,
        seller_name: sellerItem?.seller_name || "Vendedor Agrícola",
        seller_slug: sellerItem?.seller_slug,
        status: "processing",
        delivery_status: "not_assigned",
        fulfillment_method: input.fulfillmentMethod,
        delivery_otp: String(Math.floor(100000 + Math.random() * 900000)),
        subtotal: sub,
        delivery_fee: 0,
        total: sub,
        items,
      });
    });

    const paymentResult = await PaymentService.createPayment({
      orderId,
      orderNumber,
      amount: total,
      currency: cart.currency,
      paymentMethod: input.paymentMethod || "mock_sandbox",
    });

    const orderStatus: OrderStatus = paymentResult.status === "paid" ? "paid" : "pending_payment";
    const paymentStatus: PaymentStatus = paymentResult.status;

    const newOrder: OrderDescriptor = {
      id: orderId,
      order_number: orderNumber,
      customer_id: customerId,
      customer_name: input.shippingAddressSnapshot?.recipient_name || "Cliente AgroConnect",
      customer_phone: input.shippingAddressSnapshot?.phone || "+244 923 000 000",
      status: orderStatus,
      payment_status: paymentStatus,
      fulfillment_method: input.fulfillmentMethod,
      currency: cart.currency,
      subtotal,
      delivery_fee: deliveryFee,
      discount: 0,
      tax: 0,
      total,
      shipping_address: input.shippingAddressSnapshot
        ? {
            id: "addr-curr",
            profile_id: customerId,
            label: "Endereço de Entrega",
            recipient_name: input.shippingAddressSnapshot.recipient_name,
            phone: input.shippingAddressSnapshot.phone,
            address_line: input.shippingAddressSnapshot.address_line,
            province_name: input.shippingAddressSnapshot.province_name,
            municipality_name: input.shippingAddressSnapshot.municipality_name,
            notes: input.shippingAddressSnapshot.notes,
            is_default: true,
            created_at: new Date().toISOString(),
          }
        : null,
      notes: input.notes || null,
      items: pricedItems,
      seller_groups: sellerGroups,
      payment: {
        id: `pay-${Math.random().toString(36).substring(2, 8)}`,
        order_id: orderId,
        provider: paymentResult.provider,
        provider_payment_id: paymentResult.providerPaymentId,
        payment_method: input.paymentMethod,
        amount: total,
        currency: cart.currency,
        status: paymentStatus,
        paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    memoryOrders.unshift(newOrder);

    if (paymentStatus === "paid") {
      for (const item of pricedItems) {
        if (!item.product_id) continue;
        const product = await resolveProduct(item.product_id);
        const remaining = Math.max(0, (product?.quantity || 0) - item.quantity);
        await ShoppingService.updateInventory(item.product_id, item.seller_id, {
          quantity: remaining,
        });
      }
    }

    await this.clearCart(actor);

    await LogisticsService.recordTrackingEvent({
      orderId,
      orderNumber,
      status: paymentStatus,
      title: paymentStatus === "paid" ? "Pagamento Confirmado" : "Pedido criado",
      description:
        paymentStatus === "paid"
          ? `Pagamento de ${total} ${cart.currency} confirmado via gateway.`
          : "Pedido registado. Aguardando pagamento.",
      actorType: "system",
    });

    await NotificationService.createNotification({
      profileId: customerId,
      type: paymentStatus === "paid" ? "order.paid" : "order.created",
      title: paymentStatus === "paid" ? "Pagamento Confirmado" : "Pedido criado",
      message: `O seu pedido #${orderNumber} foi registado.`,
      linkUrl: `/orders/${orderNumber}`,
    });

    return {
      success: true,
      order: newOrder,
      paymentResult,
    };
  }

  public static async getOrderByNumber(
    orderNumber: string,
    actor?: CommerceActor
  ): Promise<OrderDescriptor | null> {
    if (shouldPersist(actor) && (actor?.customerId || actor?.sellerId)) {
      const persisted = await persistGetOrderByNumber(orderNumber, {
        customerId: actor.customerId || undefined,
        sellerId: actor.sellerId || undefined,
      });
      if (persisted !== null) return persisted;
    }
    const found = memoryOrders.find((order) => order.order_number === orderNumber);
    if (!found) return null;
    const sellerIds = Array.isArray(actor?.sellerId)
      ? actor.sellerId.filter(Boolean)
      : actor?.sellerId
        ? [actor.sellerId]
        : [];
    if (actor?.customerId && found.customer_id !== actor.customerId && sellerIds.length === 0) {
      return null;
    }
    if (sellerIds.length > 0) {
      const groups = found.seller_groups.filter((group) => sellerIds.includes(group.seller_id));
      if (groups.length === 0) return null;
      return {
        ...found,
        seller_groups: groups,
        items: found.items.filter((item) => sellerIds.includes(item.seller_id)),
      };
    }
    return found;
  }

  public static async getCustomerOrders(actor?: CommerceActor): Promise<OrderDescriptor[]> {
    if (shouldPersist(actor) && actor?.customerId) {
      const persisted = await persistGetCustomerOrders(actor.customerId);
      if (persisted) return persisted;
    }
    const customerId = actor?.customerId;
    if (!customerId) return memoryOrders;
    return memoryOrders.filter((order) => order.customer_id === customerId);
  }

  public static async getSellerOrders(
    sellerId?: string | string[],
    actor?: CommerceActor
  ): Promise<OrderDescriptor[]> {
    const sellerIds = (Array.isArray(sellerId) ? sellerId : sellerId ? [sellerId] : []).filter(Boolean);
    if (sellerIds.length === 0) return [];
    if (shouldPersist(actor)) {
      const persisted = await persistGetSellerOrders(sellerIds);
      if (persisted !== null) return persisted;
    }
    return memoryOrders
      .filter((order) =>
        order.seller_groups.some((group) => sellerIds.includes(group.seller_id)) ||
        order.items.some((item) => sellerIds.includes(item.seller_id))
      )
      .map((order) => ({
        ...order,
        seller_groups: order.seller_groups.filter((group) => sellerIds.includes(group.seller_id)),
        items: order.items.filter((item) => sellerIds.includes(item.seller_id)),
      }));
  }

  public static async updateFulfillmentStatus(
    orderNumber: string,
    sellerId: string,
    nextStatus: "pending" | "processing" | "ready_for_pickup" | "shipped" | "completed" | "cancelled",
    actor?: CommerceActor
  ): Promise<boolean> {
    if (!sellerId) return false;
    const persistActor: CommerceActor = { ...actor, persist: actor?.persist, sellerId };
    if (shouldPersist(persistActor)) {
      const persisted = await persistUpdateFulfillmentStatus(orderNumber, sellerId, nextStatus);
      if (persisted !== null) return persisted;
    }
    const order = memoryOrders.find((entry) => entry.order_number === orderNumber);
    if (!order) return false;
    const group = order.seller_groups.find((entry) => entry.seller_id === sellerId);
    if (!group) return false;
    group.status = nextStatus;
    if (nextStatus === "completed" && order.seller_groups.every((entry) => entry.status === "completed")) {
      order.status = "completed";
    }
    return true;
  }

  public static async cancelOrder(
    orderNumber: string,
    reason?: string,
    actor?: CommerceActor
  ): Promise<boolean> {
    if (shouldPersist(actor) && actor?.customerId) {
      const persisted = await persistCancelOrder(orderNumber, actor.customerId, reason);
      if (persisted !== null) return persisted;
    }
    const order = memoryOrders.find((entry) => entry.order_number === orderNumber);
    if (!order) return false;
    if (actor?.customerId && order.customer_id !== actor.customerId) return false;
    if (order.status === "completed") {
      throw new Error("Não é possível cancelar um pedido já concluído.");
    }
    order.status = "cancelled";
    order.cancelled_reason = reason || "Cancelado pelo cliente";
    return true;
  }

  public static async getSellerEarnings(
    sellerId: string | string[],
    actor?: CommerceActor
  ): Promise<SellerEarningsSummary> {
    const sellerIds = (Array.isArray(sellerId) ? sellerId : sellerId ? [sellerId] : []).filter(Boolean);
    if (sellerIds.length === 0) {
      return summarizeSellerEarnings("", []);
    }
    if (shouldPersist({ ...actor, sellerId: sellerIds })) {
      const persisted = await persistGetSellerEarnings(sellerIds);
      if (persisted !== null) return persisted;
    }
    const orders = await this.getSellerOrders(sellerIds, { ...actor, persist: actor?.persist, sellerId: sellerIds });
    return summarizeSellerEarnings(sellerIds, orders);
  }
}
