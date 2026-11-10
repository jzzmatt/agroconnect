import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { NotificationService } from "@/lib/services/notification-service";
import {
  groupSellerInbox,
  sellerInboxHref,
  sellerInboxSource,
} from "@/lib/notifications/seller-inbox";
import { notifySellerInbox, resolveProviderProfileIds } from "@/lib/notifications/seller-events";
import type { AppNotification } from "@/types/notifications";

function notification(partial: Partial<AppNotification> & Pick<AppNotification, "type">): AppNotification {
  return {
    id: partial.id || partial.type,
    profile_id: "prof-1",
    title: partial.title || partial.type,
    message: partial.message || "Mensagem",
    read: partial.read ?? false,
    link_url: partial.link_url,
    data: partial.data,
    created_at: partial.created_at || new Date().toISOString(),
    type: partial.type,
  };
}

describe("seller inbox", () => {
  it("groups seller activity by the existing source types", () => {
    const groups = groupSellerInbox([
      notification({ type: "quote.request", link_url: "/dashboard/product-requests" }),
      notification({ type: "service.request", link_url: "/dashboard/requests" }),
      notification({ type: "order.received" }),
      notification({ type: "transport.request" }),
      notification({ type: "order.paid", link_url: "/orders/AGC-1" }),
    ]);
    expect(groups.map((group) => group.source)).toEqual(["service", "transport", "order", "quote"]);
    expect(sellerInboxSource("logistics.updated")).toBe("order");
    expect(sellerInboxHref(notification({ type: "order.received" }))).toBe("/dashboard/orders");
    expect(sellerInboxHref(notification({ type: "service.request" }))).toBe("/dashboard/requests");
    expect(sellerInboxHref(notification({ type: "quote.request" }))).toBe("/dashboard/product-requests");
    expect(sellerInboxHref(notification({ type: "order.paid", link_url: "/orders/AGC-1" }))).toBe(
      "/orders/AGC-1"
    );
  });

  it("notifies the provider profile that already owns the seller record", async () => {
    NotificationService.resetMemoryStore();
    await expect(resolveProviderProfileIds(["prov-seed-1"])).resolves.toEqual(["prof-seed-1"]);
    await notifySellerInbox({
      profileId: "prof-seed-1",
      type: "service.request",
      title: "Novo pedido de serviço",
      message: "Preciso de vacinação",
      linkUrl: "/dashboard/requests",
      status: "pending",
    });
    const unread = await NotificationService.getUnreadCount("prof-seed-1");
    const list = await NotificationService.getUserNotifications("prof-seed-1");
    expect(unread).toBe(1);
    expect(list[0]?.link_url).toBe("/dashboard/requests");
    expect(list[0]?.data?.status).toBe("pending");
  });

  it("creates seller notifications from the existing request, quote and order events", () => {
    const marketplace = readFileSync("src/lib/services/marketplace-actions.ts", "utf8");
    const shopping = readFileSync("src/lib/services/shopping-actions.ts", "utf8");
    const commerce = readFileSync("src/lib/services/commerce-service.ts", "utf8");
    const center = readFileSync("src/components/notifications/NotificationCenter.tsx", "utf8");
    expect(marketplace).toContain('type: "service.request"');
    expect(marketplace).toContain('linkUrl: "/dashboard/requests"');
    expect(shopping).toContain('type: "quote.request"');
    expect(shopping).toContain('linkUrl: "/dashboard/product-requests"');
    expect(commerce).toContain("notifyReceivedProductOrders");
    expect(center).toContain("markAllNotificationsAsReadAction");
    expect(center).toContain("markNotificationAsReadAction");
    expect(center).not.toContain("whatsapp.message");
  });
});
