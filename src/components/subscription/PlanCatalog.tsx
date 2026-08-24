"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui";
import { Check, Lock, HelpCircle, AlertCircle } from "lucide-react";
import { getSelectablePlans } from "@/lib/services/pricing-service";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import { useI18n } from "@/i18n/provider";
import {
  formatProductLimitLabel,
  formatVideoStorageLabel,
  getLocalizedPlanCopy,
} from "@/i18n/plan-copy";
import { SubscriptionSyncModal } from "./SubscriptionSyncModal";
import type { SubscriptionPlan } from "@/types/database";

function PlanCardSkeleton() {
  return (
    <div className="w-full max-w-sm mx-auto md:max-w-none rounded-3xl p-6 sm:p-7 border border-border bg-surface-card animate-pulse space-y-4">
      <div className="h-6 w-32 bg-muted rounded-lg" />
      <div className="h-4 w-48 bg-muted rounded-lg" />
      <div className="h-10 w-40 bg-muted rounded-lg" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-5/6 bg-muted rounded" />
        <div className="h-3 w-4/6 bg-muted rounded" />
      </div>
      <div className="h-11 w-full bg-muted rounded-xl" />
    </div>
  );
}

export function PlanCatalog({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { dict } = useI18n();
  const { isSignedIn, isLoaded } = useUser();
  const { currentPlan, loading, error: planError, refresh, fromDatabase } = useAuthoritativePlan();
  const [syncPlan, setSyncPlan] = useState<SubscriptionPlan | null>(null);

  const handleSelectPlan = (planId: SubscriptionPlan) => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push(`/sign-up?plan=${planId}`);
      return;
    }

    setSyncPlan(planId);
  };

  const waitingForCurrentPlan = Boolean(isSignedIn) && (loading || (!fromDatabase && !planError));
  const availablePlans = isSignedIn ? getSelectablePlans(currentPlan) : getSelectablePlans(null);

  return (
    <>
      {isSignedIn && planError && (
        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{planError}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            {dict.pricing.retryLoad}
          </Button>
        </div>
      )}

      {waitingForCurrentPlan ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto items-stretch"
          aria-busy="true"
          aria-label={dict.pricing.loadingPlan}
        >
          <PlanCardSkeleton />
          <PlanCardSkeleton />
          <PlanCardSkeleton />
        </div>
      ) : isSignedIn && planError ? null : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
          {availablePlans.map((plan) => {
            const copy = getLocalizedPlanCopy(dict, plan.id);
            return (
              <div
                key={plan.id}
                className={`w-full max-w-sm mx-auto md:max-w-none rounded-3xl p-6 sm:p-7 border flex flex-col justify-between relative transition-all duration-300 ${
                  plan.isPopular
                    ? "border-amber-500 bg-gradient-to-b from-amber-500/10 via-surface-card to-surface-card shadow-xl ring-2 ring-amber-500/30 md:scale-102"
                    : "border-border bg-surface-card shadow-xs hover:shadow-md"
                }`}
              >
                {(copy.highlightBadge || plan.highlightBadge) && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider shadow-md whitespace-nowrap">
                    {copy.highlightBadge || plan.highlightBadge}
                  </div>
                )}

                <div className="space-y-4 text-center md:text-left">
                  <div>
                    <h3 className="text-xl font-black text-foreground">{copy.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed min-h-[36px]">
                      {copy.tagline}
                    </p>
                  </div>

                  <div className="py-3 border-y border-border">
                    <div className="flex items-baseline justify-center md:justify-start gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-foreground">{plan.priceFormatted}</span>
                      <span className="text-xs text-muted-foreground font-semibold">/{plan.period}</span>
                    </div>
                    <span className="text-xs font-bold text-primary block mt-1.5">
                      {formatProductLimitLabel(dict, plan.productLimit)}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground block mt-1">
                      {formatVideoStorageLabel(dict, plan.videoStorageLimitGb)}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                      {dict.pricing.includedFeatures}
                    </span>
                    <ul className="space-y-2.5 text-left">
                      {copy.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-foreground/90">
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-xs leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {copy.lockedFeatures.length > 0 && (
                      <div className="pt-2 border-t border-border/60">
                        <ul className="space-y-2 opacity-60 text-left">
                          {copy.lockedFeatures.map((locked, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-muted-foreground">
                              <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                              <span className="text-xs leading-snug line-through">{locked}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6">
                  <Button
                    type="button"
                    variant={plan.isPopular ? "primary" : "outline"}
                    size="sm"
                    disabled={syncPlan !== null || !isLoaded}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full font-bold text-xs h-11 ${
                      plan.isPopular ? "bg-amber-600 hover:bg-amber-700 text-white shadow-md" : ""
                    }`}
                  >
                    <span>{copy.cta}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!embedded && (
        <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-8 max-w-4xl mx-auto space-y-4 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center font-bold shrink-0">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">{dict.pricing.faqTitle}</h4>
              <p className="text-xs text-muted-foreground">{dict.pricing.faqBody}</p>
            </div>
          </div>
        </div>
      )}

      {syncPlan && (
        <SubscriptionSyncModal
          isOpen
          targetPlan={syncPlan}
          onClose={() => setSyncPlan(null)}
        />
      )}
    </>
  );
}
