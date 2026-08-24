"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Check, Loader2, Sparkles, AlertCircle, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { useSignOut } from "@/lib/auth/use-sign-out";
import { notifySubscriptionChanged } from "@/lib/subscription/use-authoritative-plan";
import { invalidateClientProfileCache } from "@/lib/auth/user-client-cache";
import {
  sanitizeActivationError,
  withDiagnosticCode,
} from "@/lib/subscription/activation-errors";
import { SUBSCRIPTION_PLANS } from "@/lib/services/pricing-service";
import type { SubscriptionPlan } from "@/types/database";

export type SyncStage =
  | "confirming"
  | "updating_plan"
  | "updating_permissions"
  | "revalidating_dashboard"
  | "revalidating_products"
  | "revalidating_courses"
  | "verifying"
  | "completed"
  | "error";

interface SubscriptionSyncModalProps {
  isOpen: boolean;
  targetPlan: SubscriptionPlan;
  onClose?: () => void;
}

const STAGE_PERCENTAGES: Record<SyncStage, number> = {
  confirming: 15,
  updating_plan: 30,
  updating_permissions: 45,
  revalidating_dashboard: 60,
  revalidating_products: 75,
  revalidating_courses: 90,
  verifying: 95,
  completed: 100,
  error: 100,
};

function isAuthFailure(status: number, error?: string | null) {
  return (
    status === 401 ||
    /autorizado|iniciar sessão|sign in|unauthor/i.test(error || "")
  );
}

function redirectToSignIn() {
  if (typeof window === "undefined") return;
  window.location.assign(`/sign-in?redirect_url=${encodeURIComponent("/planos")}`);
}

export function SubscriptionSyncModal({
  isOpen,
  targetPlan,
  onClose,
}: SubscriptionSyncModalProps) {
  const { dict } = useI18n();
  const { handleSignOut, pending: isSigningOut } = useSignOut();
  const [currentStage, setCurrentStage] = useState<SyncStage>("confirming");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const runIdRef = useRef(0);
  const dictRef = useRef(dict);
  dictRef.current = dict;

  const planName =
    SUBSCRIPTION_PLANS[targetPlan]?.name ||
    targetPlan.charAt(0).toUpperCase() + targetPlan.slice(1);

  const runSynchronizationFlow = useCallback(async () => {
    const runId = ++runIdRef.current;
    const isStale = () => runId !== runIdRef.current;
    const copy = () => dictRef.current.sync;

    setCurrentStage("confirming");
    setErrorDetails(null);

    try {
      const response = await fetch("/api/subscription/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        redirect: "manual",
        body: JSON.stringify({ plan: targetPlan }),
      });

      if (isStale()) return;
      setCurrentStage("updating_plan");

      if (
        response.type === "opaqueredirect" ||
        [301, 302, 303, 307, 308].includes(response.status)
      ) {
        redirectToSignIn();
        return;
      }

      const result = await response.json().catch(() => null);
      if (isStale()) return;

      if (isAuthFailure(response.status, result?.error)) {
        redirectToSignIn();
        return;
      }

      if (!response.ok || !result?.success) {
        if (result?.detail) {
          console.warn("[SubscriptionSync] activation failed:", result.code, result.detail);
        }
        throw new Error(
          withDiagnosticCode(
            sanitizeActivationError(result?.error, copy().errorMessage),
            result?.code
          )
        );
      }

      setCurrentStage("updating_permissions");
      invalidateClientProfileCache();
      notifySubscriptionChanged();

      setCurrentStage("revalidating_dashboard");
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (isStale()) return;

      setCurrentStage("revalidating_products");
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (isStale()) return;

      setCurrentStage("revalidating_courses");
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (isStale()) return;

      setCurrentStage("verifying");
      if (result.plan !== targetPlan) {
        throw new Error(copy().planMismatch);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (isStale()) return;

      setCurrentStage("completed");
    } catch (err: unknown) {
      if (isStale()) return;
      console.error("[SubscriptionSync] Sync error:", err);
      setErrorDetails(err instanceof Error ? err.message : copy().errorMessage);
      setCurrentStage("error");
    }
  }, [targetPlan]);

  useEffect(() => {
    if (!isOpen) return;
    void runSynchronizationFlow();
    return () => {
      runIdRef.current += 1;
    };
  }, [isOpen, targetPlan, runSynchronizationFlow]);

  if (!isOpen) return null;

  const progress = STAGE_PERCENTAGES[currentStage] || 0;
  const isCompleted = currentStage === "completed";
  const isError = currentStage === "error";

  const stageItems = [
    {
      id: "confirming",
      label: dict.sync.stageConfirmed,
      done: progress >= 30,
      active: currentStage === "confirming",
    },
    {
      id: "updating_plan",
      label: dict.sync.stageUpdatingPlan,
      done: progress >= 45,
      active: currentStage === "updating_plan",
    },
    {
      id: "updating_permissions",
      label: dict.sync.stageUpdatingPermissions,
      done: progress >= 60,
      active: currentStage === "updating_permissions",
    },
    {
      id: "revalidating_dashboard",
      label: dict.sync.stageRevalidatingDashboard,
      done: progress >= 75,
      active: currentStage === "revalidating_dashboard",
    },
    {
      id: "revalidating_products",
      label: dict.sync.stageRevalidatingProducts,
      done: progress >= 90,
      active: currentStage === "revalidating_products",
    },
    {
      id: "revalidating_courses",
      label: dict.sync.stageRevalidatingCourses,
      done: progress >= 95,
      active: currentStage === "revalidating_courses",
    },
    {
      id: "verifying",
      label: dict.sync.stageVerifying,
      done: progress === 100 && !isError,
      active: currentStage === "verifying",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-surface-elevated w-full max-w-lg rounded-3xl border border-border shadow-2xl p-6 sm:p-8 relative flex flex-col space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner ring-1 ring-amber-500/30">
            {isCompleted ? (
              <Check className="w-7 h-7 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
            ) : isError ? (
              <AlertCircle className="w-7 h-7 text-red-600" />
            ) : (
              <Sparkles className="w-7 h-7 animate-pulse text-amber-500" />
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-foreground">
            {isCompleted
              ? dict.sync.readyTitle.replace("{plan}", planName)
              : isError
              ? dict.ui.upgradeTitle
              : dict.sync.title.replace("{plan}", planName)}
          </h2>

          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {isCompleted
              ? dict.sync.readyMessage
              : isError
              ? errorDetails || dict.sync.errorMessage
              : dict.sync.subtitle}
          </p>
        </div>

        {!isError && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground uppercase text-[10px] tracking-wider">
                {isCompleted ? dict.sync.stageCompleted : dict.sync.waitingMessage}
              </span>
              <span className="text-primary font-black">{progress}%</span>
            </div>

            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden p-0.5 border border-border">
              <div
                className="h-full bg-linear-to-r from-emerald-600 to-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {!isError && (
          <div className="bg-surface p-4 rounded-2xl border border-border space-y-2.5 max-h-56 overflow-y-auto">
            {stageItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2.5 text-xs transition-opacity ${
                  item.done
                    ? "text-foreground font-semibold"
                    : item.active
                    ? "text-primary font-bold"
                    : "text-muted-foreground/60"
                }`}
              >
                {item.done ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                ) : item.active ? (
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border-strong shrink-0" />
                )}
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {isCompleted ? (
          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
              className="w-full gap-2 font-bold text-sm h-12 shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{dict.sync.signingOut}</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>{dict.sync.logoutButton}</span>
                </>
              )}
            </Button>
          </div>
        ) : isError ? (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {onClose && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-1/2 text-xs font-semibold"
              >
                {dict.common.cancel}
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={() => void runSynchronizationFlow()}
              className="w-full sm:w-1/2 gap-2 font-bold text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{dict.sync.retryButton}</span>
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-center text-muted-foreground italic">
            {dict.sync.doNotClose}
          </p>
        )}
      </div>
    </div>
  );
}
