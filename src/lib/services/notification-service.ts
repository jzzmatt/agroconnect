import { isUuid } from "@/lib/commerce/ids";
import type { AppNotification } from "@/types/domain";

export interface NotificationWriteOptions {
  persist?: boolean;
}

const SEED_NOTIFICATIONS: AppNotification[] = [
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

let memoryNotifications: AppNotification[] = [...SEED_NOTIFICATIONS];

function shouldPersist(options?: NotificationWriteOptions, profileId?: string): boolean {
  if (process.env.VITEST || process.env.VITEST_WORKER_ID) return false;
  return Boolean(options?.persist && profileId && isUuid(profileId));
}

export class NotificationService {
  public static resetMemoryStore(): void {
    memoryNotifications = [...SEED_NOTIFICATIONS].map((item) => ({ ...item, read: false }));
  }

  public static async getUserNotifications(
    profileId?: string,
    options?: NotificationWriteOptions
  ): Promise<AppNotification[]> {
    if (shouldPersist(options, profileId) && profileId) {
      const { persistListNotifications } = await import("@/lib/commerce/persist");
      const persisted = await persistListNotifications(profileId);
      if (persisted) return persisted;
    }
    if (!profileId) return memoryNotifications;
    return memoryNotifications.filter((item) => item.profile_id === profileId);
  }

  public static async getUnreadCount(
    profileId?: string,
    options?: NotificationWriteOptions
  ): Promise<number> {
    const list = await this.getUserNotifications(profileId, options);
    return list.filter((item) => !item.read).length;
  }

  public static async markAsRead(
    notificationId: string,
    profileId?: string,
    options?: NotificationWriteOptions
  ): Promise<boolean> {
    if (shouldPersist(options, profileId) && profileId) {
      const { persistMarkNotificationRead } = await import("@/lib/commerce/persist");
      const persisted = await persistMarkNotificationRead(notificationId, profileId);
      if (persisted !== null) return persisted;
    }
    const notif = memoryNotifications.find((item) => {
      if (item.id !== notificationId) return false;
      if (profileId) return item.profile_id === profileId;
      return true;
    });
    if (notif) {
      notif.read = true;
      return true;
    }
    return false;
  }

  public static async markAllAsRead(
    profileId?: string,
    options?: NotificationWriteOptions
  ): Promise<boolean> {
    if (shouldPersist(options, profileId) && profileId) {
      const { persistMarkAllNotificationsRead } = await import("@/lib/commerce/persist");
      const persisted = await persistMarkAllNotificationsRead(profileId);
      if (persisted !== null) return persisted;
    }
    memoryNotifications.forEach((item) => {
      if (!profileId || item.profile_id === profileId) item.read = true;
    });
    return true;
  }

  public static async createNotification(
    notification: {
      profileId: string;
      type: string;
      title: string;
      message: string;
      linkUrl?: string;
      data?: Record<string, unknown>;
    },
    options?: NotificationWriteOptions
  ): Promise<AppNotification> {
    if (shouldPersist(options, notification.profileId)) {
      const { persistCreateNotification } = await import("@/lib/commerce/persist");
      const persisted = await persistCreateNotification(notification);
      if (persisted) return persisted;
    }

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
