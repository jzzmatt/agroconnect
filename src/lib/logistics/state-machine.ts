import type { OrderStatus, DeliveryStatus } from "@/types/database";

/**
 * Valid state transitions for parent Orders
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "failed", "cancelled"],
  paid: ["processing", "cancelled", "refunded"],
  processing: ["ready_for_fulfillment", "ready_for_pickup", "shipped", "cancelled"],
  ready_for_fulfillment: ["shipped", "ready_for_pickup", "cancelled"],
  shipped: ["completed", "failed", "cancelled"],
  ready_for_pickup: ["completed", "cancelled"],
  completed: ["refunded"],
  cancelled: [],
  failed: ["pending_payment"],
  refunded: [],
};

/**
 * Valid state transitions for Delivery Status
 */
export const VALID_DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  not_assigned: ["assigned", "cancelled"],
  assigned: ["accepted", "not_assigned", "cancelled"],
  accepted: ["picked_up", "failed", "cancelled"],
  picked_up: ["in_transit", "failed", "cancelled"],
  in_transit: ["delivered", "failed", "cancelled"],
  delivered: [],
  failed: ["assigned", "not_assigned", "cancelled"],
  cancelled: [],
};

export function canTransitionOrderStatus(currentStatus: OrderStatus, nextStatus: OrderStatus): boolean {
  if (currentStatus === nextStatus) return true;
  const allowed = VALID_ORDER_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

export function canTransitionDeliveryStatus(currentStatus: DeliveryStatus, nextStatus: DeliveryStatus): boolean {
  if (currentStatus === nextStatus) return true;
  const allowed = VALID_DELIVERY_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

/**
 * Generates a 6-digit numeric OTP code for delivery/pickup confirmation
 */
export function generateDeliveryOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
