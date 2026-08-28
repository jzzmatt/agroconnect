"use server";

import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import { tryCreateAdminServerSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { LogisticsService } from "@/lib/services/logistics-service";
import { NotificationService } from "@/lib/services/notification-service";
import type {
  OrderTrackingEventDescriptor,
  AppNotification,
  DeliveryZoneDescriptor,
  CourierDescriptor,
} from "@/types/domain";
import type { DeliveryStatus } from "@/types/database";

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

export async function getDeliveryZonesAction(): Promise<DeliveryZoneDescriptor[]> {
  return LogisticsService.getDeliveryZones();
}

export async function getCouriersAction(provinceName?: string): Promise<CourierDescriptor[]> {
  return LogisticsService.getCouriers(provinceName);
}

export async function getOrderTrackingEventsAction(
  orderNumber: string
): Promise<OrderTrackingEventDescriptor[]> {
  const profile = await getCurrentUserProfile();
  if (!profile) return [];
  return LogisticsService.getOrderTrackingEvents(orderNumber, { persist: true });
}

export async function assignCourierAction(params: {
  orderNumber: string;
  sellerId: string;
  courierId: string;
}): Promise<{ success: boolean; courier: CourierDescriptor }> {
  await requireAuth();
  const sellerId = await resolveSessionSellerId();
  if (!sellerId) {
    throw new Error("Não autorizado: perfil de vendedor não encontrado.");
  }
  return LogisticsService.assignCourier({
    orderNumber: params.orderNumber,
    sellerId,
    courierId: params.courierId,
  });
}

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
  const sellerId = await resolveSessionSellerId();
  if (!sellerId) {
    throw new Error("Não autorizado: perfil de vendedor não encontrado.");
  }
  return LogisticsService.updateCourierDeliveryStatus({
    ...params,
    sellerId,
  });
}

export async function getUserNotificationsAction(): Promise<AppNotification[]> {
  const profile = await getCurrentUserProfile();
  if (!profile) return [];
  return NotificationService.getUserNotifications(profile.id, { persist: true });
}

export async function getUnreadNotificationCountAction(): Promise<number> {
  const profile = await getCurrentUserProfile();
  if (!profile) return 0;
  return NotificationService.getUnreadCount(profile.id, { persist: true });
}

export async function markNotificationAsReadAction(notificationId: string): Promise<boolean> {
  const profile = await requireAuth().then(() => getCurrentUserProfile());
  if (!profile) return false;
  return NotificationService.markAsRead(notificationId, profile.id, { persist: true });
}

export async function markAllNotificationsAsReadAction(): Promise<boolean> {
  const profile = await requireAuth().then(() => getCurrentUserProfile());
  if (!profile) return false;
  return NotificationService.markAllAsRead(profile.id, { persist: true });
}
