"use client";

import Link from "next/link";
import { Lock, User } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import { cn } from "@/lib/utils";

interface ControlPanelLinkProps {
  className?: string;
  fullWidth?: boolean;
  onNavigate?: () => void;
}

/**
 * Control Panel entry. Locked until a subscription is loaded from the database.
 * Unsubscribed (or still-loading) users are sent to /planos rather than the dashboard.
 */
export function ControlPanelLink({ className, fullWidth, onNavigate }: ControlPanelLinkProps) {
  const { dict } = useI18n();
  const { isSignedIn, isLoaded } = useUser();
  const { canAccessControlPanel, loading, fromDatabase, error } = useAuthoritativePlan();

  if (!isSignedIn) return null;

  const resolved = isLoaded && fromDatabase && !loading && !error;
  const unlocked = resolved && canAccessControlPanel;
  const href = unlocked ? "/dashboard" : "/planos";
  const locked = !unlocked;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(fullWidth && "w-full", className)}
      title={locked ? dict.dash.controlPanelLockedHint : dict.dash.controlPanel}
      aria-busy={loading || !isLoaded}
    >
      <Button
        variant={fullWidth ? "primary" : "outline"}
        size="sm"
        className={cn("gap-1.5 font-bold", fullWidth && "w-full justify-center")}
      >
        {locked ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <User className="w-3.5 h-3.5 text-primary" />}
        <span>{dict.navigation.dashboard}</span>
        {locked ? (
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
            {dict.dash.controlPanelLocked}
          </span>
        ) : null}
      </Button>
    </Link>
  );
}
