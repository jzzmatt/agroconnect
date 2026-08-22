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
    { href: "/services", label: "Serviços", icon: Users },
    { href: "/agriacademy", label: "Cursos", icon: GraduationCap },
    { href: "/agrishopping", label: "Produtos", icon: ShoppingBag },
    { href: "/agrilocalizacao", label: "Mais", icon: MoreHorizontal },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-elevated/95 backdrop-blur-md border-t border-border px-2 py-1 shadow-lg select-none">
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
              <span className="truncate max-w-[60px] text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
