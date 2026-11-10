"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LayoutDashboard, Receipt, ShoppingBag, Store, Users } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";

export interface MobileBottomNavProps {
  /** @deprecated Items are identical on marketing and dashboard layouts. */
  variant?: "marketing" | "dashboard";
}

export function MobileBottomNav({ variant: _variant = "marketing" }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { dict } = useI18n();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const pendingFocus = useRef<number | null>(null);
  const menuId = useId();

  const links = [
    { href: "/agriservice", label: dict.navigation.agriService, icon: Users },
    { href: "/agriacademy", label: dict.navigation.agriAcademy, icon: GraduationCap },
    { href: "/agrishopping", label: dict.navigation.agriProduct, icon: ShoppingBag },
  ];
  const dashboardActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const purchasesActive = pathname === "/orders" || pathname.startsWith("/orders/");
  const marketActive = links.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open || pendingFocus.current === null) return;
    const index = pendingFocus.current;
    pendingFocus.current = null;
    itemRefs.current[index]?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const focusItem = (index: number) => {
    itemRefs.current[(index + links.length) % links.length]?.focus();
  };

  return (
    <div
      ref={rootRef}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-elevated/95 backdrop-blur-md border-t border-border px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-lg select-none"
    >
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={dict.navigation.mercado}
          className={cn(
            "absolute bottom-full left-2 right-2 mb-2 rounded-2xl border border-border bg-surface-elevated p-2 shadow-lg",
            !reduceMotion && "animate-in fade-in slide-in-from-bottom-2"
          )}
        >
          {links.map((link, index) => {
            const Icon = link.icon;
            const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                prefetch={false}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  current ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-muted"
                )}
                onClick={() => setOpen(false)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    focusItem(index + 1);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    focusItem(index - 1);
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    focusItem(0);
                  } else if (event.key === "End") {
                    event.preventDefault();
                    focusItem(links.length - 1);
                  }
                }}
              >
                <Icon className="w-4 h-4 text-primary" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        <Link
          href="/dashboard"
          prefetch={false}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            dashboardActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className={cn("rounded-lg p-1", dashboardActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground")}>
            <LayoutDashboard className="w-4 h-4" />
          </span>
          <span className="truncate">{dict.navigation.bottomNavDashboard}</span>
        </Link>
        <Link
          href="/orders"
          prefetch={false}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            purchasesActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className={cn("rounded-lg p-1", purchasesActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground")}>
            <Receipt className="w-4 h-4" />
          </span>
          <span className="truncate">{dict.navigation.myPurchases}</span>
        </Link>
        <button
          ref={buttonRef}
          type="button"
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            marketActive || open ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          )}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={menuId}
          aria-label={dict.navigation.mercadoMenu}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              const index = event.key === "ArrowDown" ? links.length - 1 : 0;
              if (open) {
                itemRefs.current[index]?.focus();
                return;
              }
              pendingFocus.current = index;
              setOpen(true);
            }
          }}
        >
          <span className={cn("rounded-lg p-1", marketActive || open ? "bg-secondary text-secondary-foreground" : "text-muted-foreground")}>
            <Store className="w-4 h-4" />
          </span>
          <span className="truncate">{dict.navigation.mercado}</span>
        </button>
      </div>
    </div>
  );
}
