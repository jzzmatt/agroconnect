"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ShoppingBag,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";

export interface MobileBottomNavProps {
  /** @deprecated Items are identical on marketing and dashboard layouts. */
  variant?: "marketing" | "dashboard";
}

export function MobileBottomNav({ variant: _variant = "marketing" }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { dict } = useI18n();

  const items = [
    {
      href: "/dashboard",
      label: dict.navigation.bottomNavDashboard,
      icon: LayoutDashboard,
      match: (path: string) => path === "/dashboard" || path.startsWith("/dashboard/"),
    },
    {
      href: "/agrishopping",
      label: dict.navigation.agriShopping,
      icon: ShoppingBag,
      match: (path: string) => path.startsWith("/agrishopping"),
    },
    {
      href: "/agriacademy",
      label: dict.navigation.agriAcademy,
      icon: GraduationCap,
      match: (path: string) => path.startsWith("/agriacademy"),
    },
    {
      href: "/agriservice",
      label: dict.navigation.agriService,
      icon: Users,
      match: (path: string) => path.startsWith("/agriservice"),
    },
    {
      href: "/planos",
      label: dict.navigation.billing,
      icon: CreditCard,
      match: (path: string) => path === "/planos" || path.startsWith("/planos/") || path === "/pricing",
    },
  ] as const;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-elevated/95 backdrop-blur-md border-t border-border px-1 py-1 shadow-lg select-none">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-1 rounded-xl text-[10px] font-semibold transition-colors min-w-0 flex-1 max-w-[72px]",
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-lg mb-0.5 transition-colors",
                  isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="truncate w-full text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
