"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ExternalLink, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getUserNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from "@/lib/services/logistics-actions";
import type { AppNotification } from "@/types/domain";

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifs = async () => {
    const list = await getUserNotificationsAction();
    setNotifications(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsReadAction(id);
    loadNotifs();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsReadAction();
    loadNotifs();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground">Centro de Notificações</h2>
            <p className="text-xs text-muted-foreground">
              Atualizações de compras, entregas, pagamentos e eventos de logística.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllRead}
            className="text-xs font-bold gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-primary" />
            <span>Marcar Todas como Lidas</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-muted-foreground font-semibold">
          A carregar notificações...
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          Nenhuma notificação encontrada no momento.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                !notif.read ? "bg-primary/5 -mx-4 px-4 rounded-2xl" : ""
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {!notif.read && <span className="w-2 h-2 rounded-full bg-primary" />}
                  <h4 className="text-sm font-bold text-foreground">{notif.title}</h4>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(notif.created_at).toLocaleTimeString("pt-AO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{notif.message}</p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {notif.link_url && (
                  <Link
                    href={notif.link_url}
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline px-2.5 py-1.5 rounded-xl bg-surface border border-border"
                  >
                    <span>Ver Pedido</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
                {!notif.read && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 cursor-pointer"
                  >
                    Lido
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
