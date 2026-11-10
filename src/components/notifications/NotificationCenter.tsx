"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ClipboardList,
  Clock,
  ExternalLink,
  MessageCircle,
  Package,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from "@/lib/services/logistics-actions";
import {
  groupSellerInbox,
  sellerInboxHref,
  sellerInboxSource,
  sellerInboxStatus,
  type SellerInboxSource,
} from "@/lib/notifications/seller-inbox";
import type { AppNotification } from "@/types/notifications";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "./unread-notifications";

const SOURCE_ICONS = {
  service: ClipboardList,
  transport: Truck,
  order: Package,
  quote: MessageCircle,
  message: MessageCircle,
  other: Bell,
} as const;

function formatReceived(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dateLocale = locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "pt-AO";
  return new Intl.DateTimeFormat(dateLocale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
}) {
  const { dict, locale } = useI18n();
  const source = sellerInboxSource(notification.type);
  const Icon = SOURCE_ICONS[source];
  const href = sellerInboxHref(notification);
  const statusKey = sellerInboxStatus(notification);
  const statusLabel = statusKey
    ? dict.inbox.status[statusKey as keyof typeof dict.inbox.status]
    : undefined;

  return (
    <article
      className={cn(
        "py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3",
        !notification.read && "bg-primary/5 -mx-4 px-4 rounded-2xl"
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-surface border border-border text-primary flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary">
              {dict.inbox.sources[source]}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">
              {notification.read ? dict.inbox.read : dict.inbox.unread}
            </span>
            {statusLabel ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                {statusLabel}
              </span>
            ) : null}
          </div>
          <h3 className="text-sm font-bold text-foreground">{notification.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{notification.message}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <time dateTime={notification.created_at}>{formatReceived(notification.created_at, locale)}</time>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        {href ? (
          <Link
            href={href}
            onClick={() => onMarkRead(notification.id)}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline px-2.5 py-1.5 rounded-xl bg-surface border border-border"
          >
            <span>{dict.inbox.open}</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        ) : null}
        {!notification.read ? (
          <button
            type="button"
            onClick={() => onMarkRead(notification.id)}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 cursor-pointer"
          >
            {dict.inbox.markRead}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function DashboardInboxPreview() {
  const { dict } = useI18n();
  const { count, increased, loading, notifications, refresh } = useUnreadNotifications();
  const recent = notifications.slice(0, 3);
  const markRead = async (id: string) => {
    await markNotificationAsReadAction(id);
    await refresh();
  };

  return (
    <section className="bg-surface-card rounded-3xl p-6 sm:p-7 border border-border shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
            <Bell className={cn("w-4 h-4", increased && "motion-safe:animate-pulse")} />
          </div>
          <div>
            <h2 className="font-bold text-base text-foreground">{dict.inbox.previewTitle}</h2>
            <p className="text-xs text-muted-foreground">
              {dict.inbox.unreadCount.replace("{count}", String(count))}
            </p>
          </div>
        </div>
        <Link href="/dashboard/notifications" className="text-xs font-bold text-primary hover:underline">
          {dict.inbox.viewAll}
        </Link>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">{dict.inbox.loading}</p>
      ) : recent.length === 0 ? (
        <p className="text-xs text-muted-foreground">{dict.inbox.previewEmpty}</p>
      ) : (
        <div className="divide-y divide-border">
          {recent.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onMarkRead={(id) => void markRead(id)} />
          ))}
        </div>
      )}
    </section>
  );
}

export function NotificationCenter() {
  const { dict } = useI18n();
  const { count, increased, loading, notifications, refresh } = useUnreadNotifications();
  const [filter, setFilter] = useState<SellerInboxSource | "all">("all");

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsReadAction(id);
    await refresh();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsReadAction();
    await refresh();
  };

  const visible = filter === "all"
    ? notifications
    : notifications.filter((item) => sellerInboxSource(item.type) === filter);
  const groups = groupSellerInbox(visible);
  const filters: Array<SellerInboxSource | "all"> = ["all", "service", "transport", "order", "quote"];
  if (notifications.some((item) => sellerInboxSource(item.type) === "message")) {
    filters.push("message");
  }

  return (
    <div className="bg-surface-card rounded-3xl border border-border p-4 sm:p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold relative">
            <Bell className={cn("w-5 h-5", increased && "motion-safe:animate-pulse")} />
            {count > 0 ? (
              <span
                className={cn(
                  "absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center",
                  increased && "motion-safe:animate-pulse"
                )}
                aria-live="polite"
              >
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground">{dict.navDash.notificationCenter}</h2>
            <p className="text-xs text-muted-foreground">{dict.inbox.subtitle}</p>
          </div>
        </div>

        {count > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleMarkAllRead()}
            className="text-xs font-bold gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-primary" />
            <span>{dict.inbox.markAll}</span>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={dict.navDash.notificationCenter}>
        {filters.map((source) => {
          const selected = filter === source;
          const label = source === "all" ? dict.inbox.filterAll : dict.inbox.sources[source];
          return (
            <button
              key={source}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(source)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold border",
                selected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-surface text-foreground border-border"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground font-semibold">
          {dict.inbox.loading}
        </div>
      ) : groups.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">{dict.inbox.empty}</div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.source} className="space-y-1">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                {dict.inbox.sources[group.source]}
              </h3>
              <div className="divide-y divide-border">
                {group.items.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={(id) => void handleMarkAsRead(id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
