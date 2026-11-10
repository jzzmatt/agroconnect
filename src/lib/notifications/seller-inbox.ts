import type { AppNotification } from "@/types/notifications";

export type SellerInboxSource = "service" | "transport" | "order" | "quote" | "message" | "other";

const SOURCE_ORDER: SellerInboxSource[] = [
  "service",
  "transport",
  "order",
  "quote",
  "message",
  "other",
];

export function sellerInboxSource(type: string): SellerInboxSource {
  if (type.startsWith("service.")) return "service";
  if (type.startsWith("transport.")) return "transport";
  if (type.startsWith("quote.")) return "quote";
  if (type.startsWith("order.") || type.startsWith("logistics.") || type.startsWith("delivery.")) {
    return "order";
  }
  if (type.startsWith("message.") || type.startsWith("booking.")) return "message";
  return "other";
}

export function sellerInboxStatus(notification: AppNotification): string | null {
  const stored = notification.data?.status;
  if (typeof stored === "string" && stored.trim()) return stored.trim();
  const suffix = notification.type.split(".")[1];
  return suffix || null;
}

export function sellerInboxHref(notification: AppNotification): string | null {
  if (notification.link_url) return notification.link_url;
  switch (sellerInboxSource(notification.type)) {
    case "service":
      return "/dashboard/requests";
    case "transport":
      return "/dashboard/transport/requests/receiving";
    case "quote":
      return "/dashboard/product-requests";
    case "order":
      return notification.type === "order.received" ? "/dashboard/orders" : null;
    default:
      return null;
  }
}

export function groupSellerInbox(notifications: AppNotification[]): Array<{
  source: SellerInboxSource;
  items: AppNotification[];
}> {
  return SOURCE_ORDER.map((source) => ({
    source,
    items: notifications.filter((item) => sellerInboxSource(item.type) === source),
  })).filter((group) => group.items.length > 0);
}
