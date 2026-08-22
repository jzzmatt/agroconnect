"use server";

import { requireAuth } from "@/lib/clerk/auth";
import { LogisticsService } from "@/lib/services/logistics-service";
import { NotificationService } from "@/lib/services/notification-service";
import type {
  OrderTrackingEventDescriptor,
  AppNotification,
  DeliveryZoneDescriptor,
  CourierDescriptor,
} from "@/types/domain";
import type { DeliveryStatus } from "@/types/database";

/**
 * Server Action: Get Delivery Zones
 */
export async function getDeliveryZonesAction(): Promise<DeliveryZoneDescriptor[]> {
  return LogisticsService.getDeliveryZones();
}

/**
 * Server Action: Get Couriers
 */
export async function getCouriersAction(provinceName?: string): Promise<CourierDescriptor[]> {
  return LogisticsService.getCouriers(provinceName);
}

/**
 * Server Action: Get Order Tracking Events
 */
export async function getOrderTrackingEventsAction(
  orderNumber: string
): Promise<OrderTrackingEventDescriptor[]> {
  return LogisticsService.getOrderTrackingEvents(orderNumber);
}

/**
 * Server Action: Assign Courier to Order Fulfillment Group
 */
export async function assignCourierAction(params: {
  orderNumber: string;
  sellerId: string;
  courierId: string;
}): Promise<{ success: boolean; courier: CourierDescriptor }> {
  await requireAuth();
  return LogisticsService.assignCourier(params);
}

/**
 * Server Action: Update Courier Delivery Status
 */
export async function updateCourierDeliveryStatusAction(params: {
  orderNumber: string;
  sellerId: string;
  courierId: string;
  nextDeliveryStatus: DeliveryStatus;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  otpCode?: string;
  failedReason?: string;
}): Promise<{ success: boolean; message: string }> {
  await requireAuth();
  return LogisticsService.updateCourierDeliveryStatus(params);
}

/**
 * Server Action: Get User Notifications
 */
export async function getUserNotificationsAction(): Promise<AppNotification[]> {
  return NotificationService.getUserNotifications();
}

/**
 * Server Action: Get Unread Notification Count
 */
export async function getUnreadNotificationCountAction(): Promise<number> {
  return NotificationService.getUnreadCount();
}

/**
 * Server Action: Mark Notification as Read
 */
export async function markNotificationAsReadAction(notificationId: string): Promise<boolean> {
  return NotificationService.markAsRead(notificationId);
}

/**
 * Server Action: Mark All Notifications as Read
 */
export async function markAllNotificationsAsReadAction(): Promise<boolean> {
  return NotificationService.markAllAsRead();
}
