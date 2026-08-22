"use server";

import { requireAuth } from "@/lib/clerk/auth";
import {
  CommerceService,
  type AddToCartInput,
  type CheckoutOrderInput,
} from "@/lib/services/commerce-service";
import type { ShoppingCart, OrderDescriptor } from "@/types/domain";

/**
 * Server Action: Get Cart
 */
export async function getCartAction(): Promise<ShoppingCart> {
  return CommerceService.getCart();
}

/**
 * Server Action: Add item to cart
 */
export async function addToCartAction(input: AddToCartInput): Promise<ShoppingCart> {
  return CommerceService.addToCart(input);
}

/**
 * Server Action: Update cart item quantity
 */
export async function updateCartItemQuantityAction(
  productId: string,
  quantity: number
): Promise<ShoppingCart> {
  return CommerceService.updateCartItemQuantity(productId, quantity);
}

/**
 * Server Action: Remove item from cart
 */
export async function removeFromCartAction(productId: string): Promise<ShoppingCart> {
  return CommerceService.removeFromCart(productId);
}

/**
 * Server Action: Clear cart
 */
export async function clearCartAction(): Promise<ShoppingCart> {
  return CommerceService.clearCart();
}

/**
 * Server Action: Checkout Order
 */
export async function checkoutOrderAction(input: CheckoutOrderInput): Promise<{
  success: boolean;
  order: OrderDescriptor;
  paymentResult: any;
}> {
  await requireAuth();
  return CommerceService.checkoutOrder(input);
}

/**
 * Server Action: Get Order by orderNumber
 */
export async function getOrderByNumberAction(orderNumber: string): Promise<OrderDescriptor | null> {
  return CommerceService.getOrderByNumber(orderNumber);
}

/**
 * Server Action: Get customer orders
 */
export async function getCustomerOrdersAction(): Promise<OrderDescriptor[]> {
  await requireAuth();
  return CommerceService.getCustomerOrders();
}

/**
 * Server Action: Get seller orders
 */
export async function getSellerOrdersAction(sellerId?: string): Promise<OrderDescriptor[]> {
  await requireAuth();
  return CommerceService.getSellerOrders(sellerId);
}

/**
 * Server Action: Update seller fulfillment status
 */
export async function updateFulfillmentStatusAction(
  orderNumber: string,
  sellerId: string,
  nextStatus: "pending" | "processing" | "ready_for_pickup" | "shipped" | "completed" | "cancelled"
): Promise<boolean> {
  await requireAuth();
  return CommerceService.updateFulfillmentStatus(orderNumber, sellerId, nextStatus);
}

/**
 * Server Action: Cancel Order
 */
export async function cancelOrderAction(orderNumber: string, reason?: string): Promise<boolean> {
  await requireAuth();
  return CommerceService.cancelOrder(orderNumber, reason);
}
