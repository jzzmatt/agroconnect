"use server";

import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import { tryCreateAdminServerSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import {
  CommerceService,
  type AddToCartInput,
  type CheckoutOrderInput,
} from "@/lib/services/commerce-service";
import type { ShoppingCart, OrderDescriptor, SellerEarningsSummary } from "@/types/commerce";

const PERSIST = { persist: true as const };

async function requireCustomer() {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("Não autorizado: Perfil de utilizador não encontrado.");
  }
  return profile;
}

async function resolveSessionSellerId(): Promise<string | null> {
  const profile = await getCurrentUserProfile();
  if (!profile) return null;
  const supabase = tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());
  const { data } = await (supabase.from("provider_profiles") as any)
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

function emptyCart(): ShoppingCart {
  return {
    id: "cart-anonymous",
    customer_id: null,
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

export async function getCartAction(): Promise<ShoppingCart> {
  const profile = await getCurrentUserProfile();
  if (!profile) return emptyCart();
  return CommerceService.getCart({ customerId: profile.id, ...PERSIST });
}

export async function addToCartAction(input: AddToCartInput): Promise<ShoppingCart> {
  const profile = await requireCustomer();
  return CommerceService.addToCart(input, { customerId: profile.id, ...PERSIST });
}

export async function updateCartItemQuantityAction(
  productId: string,
  quantity: number
): Promise<ShoppingCart> {
  const profile = await requireCustomer();
  return CommerceService.updateCartItemQuantity(productId, quantity, {
    customerId: profile.id,
    ...PERSIST,
  });
}

export async function removeFromCartAction(productId: string): Promise<ShoppingCart> {
  const profile = await requireCustomer();
  return CommerceService.removeFromCart(productId, { customerId: profile.id, ...PERSIST });
}

export async function clearCartAction(): Promise<ShoppingCart> {
  const profile = await requireCustomer();
  return CommerceService.clearCart({ customerId: profile.id, ...PERSIST });
}

export async function checkoutOrderAction(input: CheckoutOrderInput): Promise<{
  success: boolean;
  order: OrderDescriptor;
  paymentResult: unknown;
}> {
  const profile = await requireCustomer();
  return CommerceService.checkoutOrder(input, { customerId: profile.id, ...PERSIST });
}

export async function getOrderByNumberAction(orderNumber: string): Promise<OrderDescriptor | null> {
  const profile = await requireCustomer();
  const sellerId = await resolveSessionSellerId();
  return CommerceService.getOrderByNumber(orderNumber, {
    customerId: profile.id,
    sellerId: sellerId || undefined,
    ...PERSIST,
  });
}

export async function getCustomerOrdersAction(): Promise<OrderDescriptor[]> {
  const profile = await requireCustomer();
  return CommerceService.getCustomerOrders({ customerId: profile.id, ...PERSIST });
}

export async function getSellerOrdersAction(): Promise<OrderDescriptor[]> {
  await requireAuth();
  const sellerId = await resolveSessionSellerId();
  if (!sellerId) return [];
  return CommerceService.getSellerOrders(sellerId, PERSIST);
}

export async function updateFulfillmentStatusAction(
  orderNumber: string,
  _sellerId: string,
  nextStatus: "pending" | "processing" | "ready_for_pickup" | "shipped" | "completed" | "cancelled"
): Promise<boolean> {
  await requireAuth();
  const sellerId = await resolveSessionSellerId();
  if (!sellerId) return false;
  return CommerceService.updateFulfillmentStatus(orderNumber, sellerId, nextStatus, PERSIST);
}

export async function cancelOrderAction(orderNumber: string, reason?: string): Promise<boolean> {
  const profile = await requireCustomer();
  return CommerceService.cancelOrder(orderNumber, reason, { customerId: profile.id, ...PERSIST });
}

export async function getSellerEarningsAction(): Promise<SellerEarningsSummary> {
  await requireAuth();
  const sellerId = await resolveSessionSellerId();
  if (!sellerId) {
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
  return CommerceService.getSellerEarnings(sellerId, PERSIST);
}
