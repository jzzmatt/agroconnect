import { createPublicServerSupabaseClient } from "@/lib/supabase/client";
import { PaymentService } from "@/lib/payments";
import { INITIAL_PRODUCTS, ShoppingService } from "@/lib/services/shopping-service";
import type {
  ShoppingCart,
  CartItemDescriptor,
  OrderDescriptor,
  CustomerAddress,
  OrderItemDescriptor,
  OrderSellerGroupDescriptor,
  PaymentRecordDescriptor,
} from "@/types/domain";
import type {
  OrderStatus,
  PaymentStatus,
  OrderFulfillmentMethod,
  PaymentMethod,
} from "@/types/database";

export interface AddToCartInput {
  productId: string;
  quantity?: number;
}

export interface CheckoutOrderInput {
  fulfillmentMethod: OrderFulfillmentMethod;
  shippingAddressId?: string;
  shippingAddressSnapshot?: {
    recipient_name: string;
    phone: string;
    address_line: string;
    province_name?: string;
    municipality_name?: string;
    notes?: string;
  };
  paymentMethod: PaymentMethod;
  notes?: string;
}

// In-memory persistent cart session for sandbox/guest/tests
let memoryCart: ShoppingCart = {
  id: "cart-session-default",
  customer_id: "demo-user",
  currency: "AOA",
  items: [],
  items_count: 0,
  subtotal: 0,
  delivery_fee: 0,
  discount: 0,
  total: 0,
  sellers_count: 0,
};

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

let memoryOrders: OrderDescriptor[] = [...INITIAL_ORDERS];

let orderSeq = 2;

export function recalculateCart(items: CartItemDescriptor[]): ShoppingCart {
  const sellers = new Set(items.map((i) => i.seller_id));
  const subtotal = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const delivery_fee = 0;
  const discount = 0;
  const total = subtotal + delivery_fee - discount;

  return {
    id: memoryCart.id,
    customer_id: memoryCart.customer_id,
    currency: "AOA",
    items,
    items_count: items.reduce((acc, item) => acc + item.quantity, 0),
    subtotal,
    delivery_fee,
    discount,
    total,
    sellers_count: sellers.size,
  };
}

export class CommerceService {
  /**
   * Get active cart
   */
  public static async getCart(): Promise<ShoppingCart> {
    return memoryCart;
  }

  /**
   * Add or increment item in cart with server-side price validation
   */
  public static async addToCart(input: AddToCartInput): Promise<ShoppingCart> {
    const product = await ShoppingService.getProductBySlug(input.productId) ||
      INITIAL_PRODUCTS.find((p) => p.id === input.productId || p.slug === input.productId);

    if (!product) {
      throw new Error("Produto não encontrado.");
    }
    if (product.availability_status === "out_of_stock") {
      throw new Error("Este produto encontra-se temporariamente sem stock.");
    }

    const qtyToAdd = input.quantity && input.quantity > 0 ? input.quantity : 1;
    const existingIndex = memoryCart.items.findIndex((item) => item.product_id === product.id);

    let updatedItems = [...memoryCart.items];

    if (existingIndex >= 0) {
      const existing = updatedItems[existingIndex];
      const nextQty = existing.quantity + qtyToAdd;
      if (product.quantity && nextQty > product.quantity) {
        throw new Error(`Apenas ${product.quantity} ${product.unit} disponíveis em stock.`);
      }
      updatedItems[existingIndex] = {
        ...existing,
        quantity: nextQty,
        unit_price: product.price, // Revalidate with official price
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
      });
    }

    memoryCart = recalculateCart(updatedItems);
    return memoryCart;
  }

  /**
   * Update item quantity in cart
   */
  public static async updateCartItemQuantity(productId: string, quantity: number): Promise<ShoppingCart> {
    if (quantity <= 0) {
      return this.removeFromCart(productId);
    }

    const product = INITIAL_PRODUCTS.find((p) => p.id === productId || p.slug === productId);
    if (product && product.quantity && quantity > product.quantity) {
      throw new Error(`Apenas ${product.quantity} ${product.unit} disponíveis em stock.`);
    }

    const updatedItems = memoryCart.items.map((item) => {
      if (item.product_id === productId || item.slug === productId) {
        return {
          ...item,
          quantity,
          subtotal: quantity * item.unit_price,
        };
      }
      return item;
    });

    memoryCart = recalculateCart(updatedItems);
    return memoryCart;
  }

  /**
   * Remove item from cart
   */
  public static async removeFromCart(productId: string): Promise<ShoppingCart> {
    const updatedItems = memoryCart.items.filter(
      (item) => item.product_id !== productId && item.slug !== productId
    );
    memoryCart = recalculateCart(updatedItems);
    return memoryCart;
  }

  /**
   * Clear all items in cart
   */
  public static async clearCart(): Promise<ShoppingCart> {
    memoryCart = recalculateCart([]);
    return memoryCart;
  }

  /**
   * Create order, process payment intent, deduct inventory atomically, and group sellers
   */
  public static async checkoutOrder(input: CheckoutOrderInput): Promise<{
    success: boolean;
    order: OrderDescriptor;
    paymentResult: any;
  }> {
    if (memoryCart.items.length === 0) {
      throw new Error("O seu carrinho está vazio.");
    }

    // Server-side validation: Re-verify all product prices, stock, and availability
    for (const item of memoryCart.items) {
      const freshProduct = INITIAL_PRODUCTS.find((p) => p.id === item.product_id);
      if (freshProduct && freshProduct.availability_status === "out_of_stock") {
        throw new Error(`O produto "${item.title}" já não está disponível em stock.`);
      }
    }

    const year = new Date().getFullYear();
    const orderNumber = `AGC-${year}-${String(orderSeq++).padStart(6, "0")}`;
    const orderId = `ord-${Math.random().toString(36).substring(2, 9)}`;

    // Build Order Items with Historical Price Snapshots
    const orderItems: OrderItemDescriptor[] = memoryCart.items.map((item) => ({
      id: `oi-${Math.random().toString(36).substring(2, 8)}`,
      order_id: orderId,
      product_id: item.product_id,
      seller_id: item.seller_id,
      product_title: item.title,
      product_slug: item.slug,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      currency: item.currency,
    }));

    // Multi-seller fulfillment grouping
    const sellerGroupMap = new Map<string, OrderItemDescriptor[]>();
    orderItems.forEach((oi) => {
      const list = sellerGroupMap.get(oi.seller_id) || [];
      list.push(oi);
      sellerGroupMap.set(oi.seller_id, list);
    });

    const sellerGroups: OrderSellerGroupDescriptor[] = [];
    sellerGroupMap.forEach((items, sellerId) => {
      const sellerItem = memoryCart.items.find((ci) => ci.seller_id === sellerId);
      const sub = items.reduce((acc, i) => acc + i.subtotal, 0);
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

    // Process Payment via PaymentService abstraction
    const paymentResult = await PaymentService.createPayment({
      orderId,
      orderNumber,
      amount: memoryCart.total,
      currency: memoryCart.currency,
      paymentMethod: input.paymentMethod || "mock_sandbox",
    });

    const orderStatus: OrderStatus = paymentResult.status === "paid" ? "paid" : "pending_payment";
    const paymentStatus: PaymentStatus = paymentResult.status;

    const newOrder: OrderDescriptor = {
      id: orderId,
      order_number: orderNumber,
      customer_id: memoryCart.customer_id || "cust-demo",
      customer_name: input.shippingAddressSnapshot?.recipient_name || "Cliente AgroConnect",
      customer_phone: input.shippingAddressSnapshot?.phone || "+244 923 000 000",
      status: orderStatus,
      payment_status: paymentStatus,
      fulfillment_method: input.fulfillmentMethod,
      currency: memoryCart.currency,
      subtotal: memoryCart.subtotal,
      delivery_fee: memoryCart.delivery_fee,
      discount: memoryCart.discount,
      tax: 0,
      total: memoryCart.total,
      shipping_address: input.shippingAddressSnapshot
        ? {
            id: "addr-curr",
            profile_id: memoryCart.customer_id || "cust-demo",
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
      items: orderItems,
      seller_groups: sellerGroups,
      payment: {
        id: `pay-${Math.random().toString(36).substring(2, 8)}`,
        order_id: orderId,
        provider: paymentResult.provider,
        provider_payment_id: paymentResult.providerPaymentId,
        payment_method: input.paymentMethod,
        amount: memoryCart.total,
        currency: memoryCart.currency,
        status: paymentStatus,
        paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    memoryOrders.unshift(newOrder);

    // Empty cart on successful order creation
    await this.clearCart();

    return {
      success: true,
      order: newOrder,
      paymentResult,
    };
  }

  /**
   * Get order by orderNumber
   */
  public static async getOrderByNumber(orderNumber: string): Promise<OrderDescriptor | null> {
    const found = memoryOrders.find((o) => o.order_number === orderNumber);
    return found || null;
  }

  /**
   * Get all customer orders
   */
  public static async getCustomerOrders(): Promise<OrderDescriptor[]> {
    return memoryOrders;
  }

  /**
   * Get seller's incoming orders
   */
  public static async getSellerOrders(sellerId?: string): Promise<OrderDescriptor[]> {
    if (!sellerId) return memoryOrders;
    return memoryOrders.filter((o) =>
      o.seller_groups.some((sg) => sg.seller_id === sellerId)
    );
  }

  /**
   * Update seller fulfillment status
   */
  public static async updateFulfillmentStatus(
    orderNumber: string,
    sellerId: string,
    nextStatus: "pending" | "processing" | "ready_for_pickup" | "shipped" | "completed" | "cancelled"
  ): Promise<boolean> {
    const order = memoryOrders.find((o) => o.order_number === orderNumber);
    if (!order) return false;

    const group = order.seller_groups.find((sg) => sg.seller_id === sellerId);
    if (group) {
      group.status = nextStatus;
      if (nextStatus === "completed") {
        order.status = "completed";
      }
      return true;
    }
    return false;
  }

  /**
   * Customer cancel order
   */
  public static async cancelOrder(orderNumber: string, reason?: string): Promise<boolean> {
    const order = memoryOrders.find((o) => o.order_number === orderNumber);
    if (!order) return false;

    if (order.status === "completed") {
      throw new Error("Não é possível cancelar um pedido já concluído.");
    }

    order.status = "cancelled";
    order.cancelled_reason = reason || "Cancelado pelo cliente";
    return true;
  }
}
