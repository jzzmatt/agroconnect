"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sprout, X, LogOut, Lock } from "lucide-react";
import { getDashboardNavigation } from "@/config/navigation";
import { useI18n } from "@/i18n/provider";
import { useSignOut } from "@/lib/auth/use-sign-out";
import { can, subjectFromProfile, type Permission } from "@/lib/authorization";
import type { UserRoleType, ProfileType, SubscriptionPlan } from "@/types/database";
import { parseStoredPlan } from "@/lib/services/pricing-service";
import { PROFILE_TYPE_CONFIG } from "@/lib/auth/identity-resolvers";
import { resolveAgriprofileNavHref } from "@/lib/agriprofile/paths";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { cn } from "@/lib/utils";

function pathMatchesHref(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || (href !== "/planos" && pathname.startsWith(`${href}/`));
}

interface DashboardSidebarProps {
  userRoles?: UserRoleType[];
  availableProfiles?: ProfileType[];
  activeProfile?: ProfileType;
  subscriptionPlan?: SubscriptionPlan | string | null;
  clerkUserId?: string | null;
  onSwitchProfile?: (profile: ProfileType) => void;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function DashboardSidebar({
  userRoles = ["student"],
  availableProfiles = ["personal"],
  activeProfile = "personal",
  subscriptionPlan = null,
  clerkUserId = null,
  onSwitchProfile,
  isOpen,
  onClose,
  className,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { dict } = useI18n();
  const { handleSignOut, pending: signingOut } = useSignOut();
  const navigation = getDashboardNavigation(dict);

  // Presentation-only capability subject. Every module a user may view stays
  // visible; the ones they cannot manage are shown locked. Server guards decide
  // what is actually permitted.
  const subject = subjectFromProfile({
    id: "",
    clerk_user_id: "",
    roles: userRoles,
    account_type: "customer",
    subscription_plan: parseStoredPlan(subscriptionPlan),
  });

  /**
   * Which capability unlocks management for a module. A module absent from this
   * map is never locked, because viewing it is not a paid capability.
   */
  const moduleManagePermission: Partial<Record<
    NonNullable<(typeof navigation)[number]["requiredModule"]>,
    Permission
  >> = {
    agriShopping: "product.create",
    agriAcademy: "academy.course.create",
    agriExpert: "service.manage",
  };

  const visibleSections = navigation.filter((section) => {
    // Free/basic may view all five major modules, so module sections are never
    // hidden on subscription grounds — only locked.
    if (section.requiredModule) return true;
    if (!section.roles || section.roles.length === 0) return true;
    return section.roles.some((role) => userRoles.includes(role));
  });

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-64 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-sidebar-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
            <Sprout className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight text-sidebar-foreground font-sans">
              {dict.common.brandName}
            </span>
            <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
              {dict.dash.controlPanel}
            </span>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-muted-foreground hover:bg-muted rounded-lg"
            aria-label="Fechar navegação"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Active Profile Switcher in Sidebar */}
      {onSwitchProfile && availableProfiles.length > 1 && (
        <div className="p-3 border-b border-sidebar-border">
          <ProfileSwitcher
            availableProfiles={availableProfiles}
            activeProfile={activeProfile}
            onSwitch={onSwitchProfile}
          />
        </div>
      )}

      {/* Navigation Links (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {visibleSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h4 className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h4>
            <div className="space-y-0.5 pt-1">
              {section.items.map((item) => {
                const resolvedHref = resolveAgriprofileNavHref(item.href, clerkUserId);
                const matchingHrefs = section.items
                  .map((entry) => resolveAgriprofileNavHref(entry.href, clerkUserId))
                  .filter((href) => pathMatchesHref(pathname, href));
                const longestMatch = matchingHrefs.reduce(
                  (best, href) => (href.length > best.length ? href : best),
                  ""
                );
                const isActive = longestMatch === resolvedHref;
                const Icon = item.icon;
                const sectionManagePermission = section.requiredModule
                  ? moduleManagePermission[section.requiredModule]
                  : undefined;
                const itemLocked = item.neverLock
                  ? false
                  : item.requiredPermission
                    ? !can(subject, item.requiredPermission)
                    : sectionManagePermission
                      ? !can(subject, sectionManagePermission)
                      : false;
                const href = itemLocked ? "/planos" : resolvedHref;
                return (
                  <Link
                    key={`${item.href}-${item.title}`}
                    href={href}
                    onClick={() => onClose && onClose()}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                      isActive && !itemLocked
                        ? "bg-sidebar-active text-sidebar-active-foreground shadow-xs font-bold"
                        : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0",
                          isActive && !itemLocked ? "text-primary-foreground" : "text-primary"
                        )}
                      />
                      <span className="truncate">{item.title}</span>
                    </div>
                    {itemLocked ? (
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                    ) : item.badge ? (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[9px] font-bold",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Areas of Activity in Ecosystem Footer */}
      <div className="p-4 border-t border-sidebar-border bg-surface-muted/50 space-y-3">
        {!can(subject, "product.create") && (
          <Link
            href="/planos"
            onClick={() => onClose && onClose()}
            className="block rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-200">
              AgriProduct 🔒
            </span>
            <span className="block text-[11px] font-bold text-amber-900 dark:text-amber-100 mt-0.5">
              {dict.dash.upgradePlan}
            </span>
          </Link>
        )}
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
          {dict.dash.areas}
        </span>
        <div className="flex flex-wrap gap-1">
          {availableProfiles.map((type) => {
            const config = PROFILE_TYPE_CONFIG[type] || PROFILE_TYPE_CONFIG.personal;
            return (
              <span
                key={type}
                className="px-2 py-0.5 rounded-md bg-surface-elevated border border-border text-[10px] font-bold text-foreground shadow-2xs flex items-center gap-1"
              >
                <span>{config.icon}</span>
                <span>{config.label}</span>
              </span>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            onClose && onClose();
            void handleSignOut();
          }}
          disabled={signingOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{dict.navigation.signOut}</span>
        </button>
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
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-sidebar shadow-2xl animate-in slide-in-from-left-4">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
