"use server";

import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import { resolveSessionSellerId, resolveSessionSellerIds } from "@/lib/commerce/session-seller";
import {
  CommerceService,
  type AddToCartInput,
  type CheckoutOrderInput,
} from "@/lib/services/commerce-service";
import {
  cartErrorMessage,
  emptyShoppingCart,
  toSerializableCart,
  toSerializableOrder,
} from "@/lib/commerce/serialize";
import type { ShoppingCart, OrderDescriptor, SellerEarningsSummary } from "@/types/commerce";

const PERSIST = { persist: true as const };

export type CartMutationResult = {
  success: boolean;
  cart: ShoppingCart;
  error?: string;
};

async function requireCustomer() {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("Não autorizado: Perfil de utilizador não encontrado.");
  }
  return profile;
}

async function runCartMutation(
  work: () => Promise<ShoppingCart>
): Promise<CartMutationResult> {
  try {
    return { success: true, cart: toSerializableCart(await work()) };
  } catch (error) {
    return {
      success: false,
      cart: emptyShoppingCart(),
      error: cartErrorMessage(error, "Não foi possível atualizar o carrinho. Tente novamente."),
    };
  }
}

export async function getCartAction(): Promise<ShoppingCart> {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) return emptyShoppingCart();
    return toSerializableCart(await CommerceService.getCart({ customerId: profile.id, ...PERSIST }));
  } catch {
    return emptyShoppingCart();
  }
}

export async function addToCartAction(input: AddToCartInput): Promise<CartMutationResult> {
  return runCartMutation(async () => {
    const profile = await requireCustomer();
    return CommerceService.addToCart(input, { customerId: profile.id, ...PERSIST });
  });
}

export async function updateCartItemQuantityAction(
  productId: string,
  quantity: number
): Promise<CartMutationResult> {
  return runCartMutation(async () => {
    const profile = await requireCustomer();
    return CommerceService.updateCartItemQuantity(productId, quantity, {
      customerId: profile.id,
      ...PERSIST,
    });
  });
}

export async function removeFromCartAction(productId: string): Promise<CartMutationResult> {
  return runCartMutation(async () => {
    const profile = await requireCustomer();
    return CommerceService.removeFromCart(productId, { customerId: profile.id, ...PERSIST });
  });
}

export async function clearCartAction(): Promise<CartMutationResult> {
  return runCartMutation(async () => {
    const profile = await requireCustomer();
    return CommerceService.clearCart({ customerId: profile.id, ...PERSIST });
  });
}

export async function checkoutOrderAction(input: CheckoutOrderInput): Promise<{
  success: boolean;
  order: OrderDescriptor | null;
  paymentResult: unknown;
  error?: string;
}> {
  try {
    const profile = await requireCustomer();
    const result = await CommerceService.checkoutOrder(input, { customerId: profile.id, ...PERSIST });
    return {
      success: true,
      order: result.order,
      paymentResult: result.paymentResult,
    };
  } catch (error) {
    return {
      success: false,
      order: null,
      paymentResult: null,
      error: cartErrorMessage(error, "Não foi possível concluir o pedido. Tente novamente."),
    };
  }
}

export async function getOrderByNumberAction(orderNumber: string): Promise<OrderDescriptor | null> {
  try {
    const profile = await requireCustomer();
    const sellerId = await resolveSessionSellerId();
    return CommerceService.getOrderByNumber(orderNumber, {
      customerId: profile.id,
      sellerId: sellerId || undefined,
      ...PERSIST,
    });
  } catch {
    return null;
  }
}

export async function getCustomerOrdersAction(): Promise<OrderDescriptor[]> {
  try {
    const profile = await requireCustomer();
    return CommerceService.getCustomerOrders({ customerId: profile.id, ...PERSIST });
  } catch {
    return [];
  }
}

export async function getSellerOrdersAction(): Promise<OrderDescriptor[]> {
  try {
    await requireAuth();
    const sellerIds = await resolveSessionSellerIds();
    if (sellerIds.length === 0) return [];
    const orders = await CommerceService.getSellerOrders(sellerIds, {
      persist: true,
      sellerId: sellerIds,
    });
    return orders.map(toSerializableOrder);
  } catch {
    return [];
  }
}

export async function updateFulfillmentStatusAction(
  orderNumber: string,
  _sellerId: string,
  nextStatus: "pending" | "processing" | "ready_for_pickup" | "shipped" | "completed" | "cancelled"
): Promise<boolean> {
  await requireAuth();
  const sellerIds = await resolveSessionSellerIds();
  if (sellerIds.length === 0) return false;
  const requestedSellerId = String(_sellerId || "");
  const sellerId = sellerIds.includes(requestedSellerId) ? requestedSellerId : sellerIds[0];
  return CommerceService.updateFulfillmentStatus(orderNumber, sellerId, nextStatus, {
    persist: true,
    sellerId: sellerIds,
  });
}

export async function cancelOrderAction(orderNumber: string, reason?: string): Promise<boolean> {
  const profile = await requireCustomer();
  return CommerceService.cancelOrder(orderNumber, reason, { customerId: profile.id, ...PERSIST });
}

export async function getSellerEarningsAction(): Promise<SellerEarningsSummary> {
  await requireAuth();
  const sellerIds = await resolveSessionSellerIds();
  if (sellerIds.length === 0) {
    return {
      seller_id: "",
      currency: "AOA",
      total_earned: 0,
      total_processing: 0,
      completed_count: 0,
      processing_count: 0,
      entries: [],
    };
  }
  return CommerceService.getSellerEarnings(sellerIds, { persist: true, sellerId: sellerIds });
}
