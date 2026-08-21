"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  GraduationCap,
  ShoppingBag,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileBottomNavProps {
  variant?: "marketing" | "dashboard";
}

export function MobileBottomNav({ variant = "marketing" }: MobileBottomNavProps) {
  const pathname = usePathname();

  // Bottom navigation labels matching Figma design:
  // Início, Serviços, Cursos, Produtos, Mais
  const items = [
    { href: variant === "dashboard" ? "/dashboard" : "/", label: "Início", icon: Home },
    { href: "/agriexpert", label: "Serviços", icon: Users },
    { href: "/agriacademy", label: "Cursos", icon: GraduationCap },
    { href: "/agrishopping", label: "Produtos", icon: ShoppingBag },
    { href: "/agrilocalizacao", label: "Mais", icon: MoreHorizontal },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-900/10 px-2 py-1 shadow-lg select-none">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[11px] font-semibold transition-colors min-w-[56px]",
                isActive
                  ? "text-emerald-800 font-bold"
                  : "text-emerald-950/60 hover:text-emerald-950"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-lg mb-0.5 transition-colors",
                  isActive ? "bg-emerald-100 text-emerald-800" : "text-emerald-700/70"
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="truncate max-w-[60px] text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
