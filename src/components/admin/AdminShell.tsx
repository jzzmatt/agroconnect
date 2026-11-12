"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", key: "overview" },
  { href: "/admin/users", key: "users" },
  { href: "/admin/health", key: "health" },
  { href: "/admin/analytics", key: "analytics" },
  { href: "/admin/demo-catalog", key: "demoCatalog" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { dict } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="border-b border-border bg-surface-card md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-4 py-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{dict.admin.title}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-1 md:px-3 md:pb-6">
          {LINKS.map((link) => {
            const active = link.href === "/admin" ? pathname === "/admin" : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {dict.admin[link.key]}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
