"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, GraduationCap, Menu, ShoppingBag, Sprout, Users, X } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { useI18n } from "@/i18n/provider";
import { NavbarCartLink } from "@/components/commerce/NavbarCartLink";
import { cn } from "@/lib/utils";

const linkClass =
  "px-3 py-2 rounded-xl text-xs xl:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { dict } = useI18n();
  const reduceMotion = useReducedMotion();

  const marketLinks = [
    { href: "/agriservice", label: dict.navigation.agriService, icon: Users },
    { href: "/agriacademy", label: dict.navigation.agriAcademy, icon: GraduationCap },
    { href: "/agrishopping", label: dict.navigation.agriProduct, icon: ShoppingBag },
  ];
  const vendorActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const marketActive = marketLinks.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full bg-surface-elevated/90 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-16 sm:h-18 min-w-0">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group min-w-0 flex-1 lg:flex-none rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md group-hover:bg-primary-hover transition-colors shrink-0">
              <Sprout className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-200" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-base sm:text-xl font-black tracking-tight text-foreground font-sans truncate">
                {dict.common.brandName}
              </span>
              <span className="hidden sm:block text-[10px] font-bold text-primary tracking-wider uppercase truncate">
                {dict.navigation.brandSubtitle}
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 xl:gap-2" aria-label={dict.navigation.menu}>
            <Link
              href="/"
              className={cn(linkClass, pathname === "/" ? "bg-secondary text-secondary-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
            >
              {dict.navigation.home}
            </Link>
            <Link
              href="/dashboard"
              className={cn(linkClass, vendorActive ? "bg-secondary text-secondary-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted")}
            >
              {dict.navigation.vendor}
            </Link>
            <MercadoMenu links={marketLinks} active={marketActive} reduceMotion={Boolean(reduceMotion)} />
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <LanguageSelector compact />
            <NavbarCartLink />
            <ThemeSwitcher />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 lg:hidden shrink-0">
            <NavbarCartLink />
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="p-2 rounded-xl text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={dict.navigation.openMenu}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className={cn("lg:hidden border-t border-border bg-surface-elevated px-4 pt-3 pb-6 space-y-3", !reduceMotion && "animate-in slide-in-from-top-2")}>
          <div className="flex flex-col items-center gap-3 pb-3 border-b border-border">
            <LanguageSelector compact className="w-full justify-center" />
            <ThemeSwitcher />
          </div>
          <nav className="flex flex-col space-y-1" aria-label={dict.navigation.menu}>
            <Link
              href="/"
              className={cn(linkClass, "px-4 py-3 text-sm", pathname === "/" ? "bg-secondary text-secondary-foreground font-bold" : "text-foreground hover:bg-muted")}
            >
              {dict.navigation.home}
            </Link>
            <Link
              href="/dashboard"
              className={cn(linkClass, "px-4 py-3 text-sm", vendorActive ? "bg-secondary text-secondary-foreground font-bold" : "text-foreground hover:bg-muted")}
            >
              {dict.navigation.vendor}
            </Link>
            <MercadoMenu links={marketLinks} active={marketActive} reduceMotion={Boolean(reduceMotion)} />
          </nav>
        </div>
      )}
    </header>
  );
}

function MercadoMenu({
  links,
  active,
  reduceMotion,
}: {
  links: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
  active: boolean;
  reduceMotion: boolean;
}) {
  const { dict } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const pendingFocus = useRef<number | null>(null);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open || pendingFocus.current === null) return;
    const index = pendingFocus.current;
    pendingFocus.current = null;
    itemRefs.current[index]?.focus();
  }, [open, links.length]);

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
    const next = (index + links.length) % links.length;
    itemRefs.current[next]?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          linkClass,
          "inline-flex items-center gap-1.5",
          active || open ? "bg-secondary text-secondary-foreground font-bold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={dict.navigation.mercadoMenu}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const index = event.key === "ArrowUp" ? links.length - 1 : 0;
            if (open) {
              itemRefs.current[index]?.focus();
              return;
            }
            pendingFocus.current = index;
            setOpen(true);
          }
        }}
      >
        <span>{dict.navigation.mercado}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180", reduceMotion && "transition-none")} />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={dict.navigation.mercado}
          className={cn(
            "z-50 mt-2 w-full min-w-56 rounded-2xl border border-border bg-surface-elevated p-2 shadow-lg lg:absolute lg:left-0 lg:top-full",
            !reduceMotion && "animate-in fade-in slide-in-from-top-1"
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
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
    </div>
  );
}
