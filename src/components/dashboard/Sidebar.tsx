"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sprout, X } from "lucide-react";
import { DASHBOARD_NAVIGATION } from "@/config/navigation";
import type { UserRoleType } from "@/types/database";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  userRoles?: UserRoleType[];
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function DashboardSidebar({
  userRoles = ["student", "expert", "seller"], // Default demo multi-roles
  isOpen,
  onClose,
  className,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  // Filter navigation sections based on active user roles
  const visibleSections = DASHBOARD_NAVIGATION.filter((section) => {
    if (!section.roles || section.roles.length === 0) return true;
    return section.roles.some((role) => userRoles.includes(role));
  });

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-emerald-900/10 w-64 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-emerald-900/10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center text-white shadow-xs">
            <Sprout className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight text-emerald-950 font-sans">
              AGROCONNECT
            </span>
            <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
              Painel de Controlo
            </span>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-emerald-800 hover:bg-emerald-50 rounded-lg"
            aria-label="Fechar navegação"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {visibleSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h4 className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-emerald-900/60">
              {section.title}
            </h4>
            <div className="space-y-0.5 pt-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onClose && onClose()}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-emerald-800 text-white shadow-xs font-bold"
                        : "text-emerald-950 hover:bg-emerald-50 hover:text-emerald-900"
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0",
                          isActive ? "text-emerald-300" : "text-emerald-700"
                        )}
                      />
                      <span className="truncate">{item.title}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[9px] font-bold",
                          isActive
                            ? "bg-emerald-700 text-emerald-100"
                            : "bg-emerald-100 text-emerald-800"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Role Badges Footer */}
      <div className="p-4 border-t border-emerald-900/10 bg-emerald-50/40">
        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1.5">
          Funções Ativas
        </span>
        <div className="flex flex-wrap gap-1">
          {userRoles.map((role) => (
            <span
              key={role}
              className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-[10px] font-bold text-emerald-900 shadow-2xs capitalize"
            >
              {role.replace("_", " ")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className={cn("hidden lg:block shrink-0 h-screen sticky top-0 z-30", className)}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay & Sidebar */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-emerald-950/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl animate-in slide-in-from-left-4">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
