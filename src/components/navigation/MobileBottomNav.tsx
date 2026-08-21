"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  GraduationCap,
  ShoppingBag,
  MapPin,
  LayoutDashboard,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { dict } = useI18n();

  const items = [
    { href: "/", label: dict.navigation.home, icon: Home },
    { href: "/agriexpert", label: dict.navigation.agriExpert, icon: Users },
    { href: "/agriacademy", label: dict.navigation.agriAcademy, icon: GraduationCap },
    { href: "/agrishopping", label: dict.navigation.agriShopping, icon: ShoppingBag },
    { href: "/agrilocalizacao", label: dict.navigation.agriLocalizacao, icon: MapPin },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-900/10 px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-colors min-w-[54px]",
                isActive
                  ? "text-emerald-800 font-bold"
                  : "text-emerald-900/60 hover:text-emerald-950"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-lg mb-0.5",
                  isActive ? "bg-emerald-100/80 text-emerald-800" : "text-emerald-700/70"
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="truncate max-w-[58px] text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
