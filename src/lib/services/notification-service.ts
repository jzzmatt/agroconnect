import { createPublicServerSupabaseClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/types/domain";

let memoryNotifications: AppNotification[] = [
  {
    id: "notif-1",
    profile_id: "demo-user",
    type: "order.paid",
    title: "Pagamento Confirmado",
    message: "O seu pedido #AGC-2026-000001 foi pago com sucesso e os produtos estão a ser preparados.",
    read: false,
    link_url: "/orders/AGC-2026-000001",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "notif-2",
    profile_id: "demo-user",
    type: "order.confirmed",
    title: "Vendedor Confirmou o Pedido",
    message: "Dr. João Silva confirmou a preparação de 2x Sementes de Milho ZM-521.",
    read: false,
    link_url: "/orders/AGC-2026-000001",
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

export class NotificationService {
  public static async getUserNotifications(profileId?: string): Promise<AppNotification[]> {
    return memoryNotifications;
  }

  public static async getUnreadCount(profileId?: string): Promise<number> {
    return memoryNotifications.filter((n) => !n.read).length;
  }

  public static async markAsRead(notificationId: string): Promise<boolean> {
    const notif = memoryNotifications.find((n) => n.id === notificationId);
    if (notif) {
      notif.read = true;
      return true;
    }
    return false;
  }

  public static async markAllAsRead(profileId?: string): Promise<boolean> {
    memoryNotifications.forEach((n) => (n.read = true));
    return true;
  }

  public static async createNotification(notification: {
    profileId: string;
    type: string;
    title: string;
    message: string;
    linkUrl?: string;
    data?: Record<string, any>;
  }): Promise<AppNotification> {
    const created: AppNotification = {
      id: `notif-${Math.random().toString(36).substring(2, 8)}`,
      profile_id: notification.profileId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: false,
      link_url: notification.linkUrl,
      data: notification.data,
      created_at: new Date().toISOString(),
    };

    memoryNotifications.unshift(created);
    return created;
  }
}
