"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { getSellerEarningsAction } from "@/lib/services/commerce-actions";
import type { SellerEarningsSummary } from "@/types/commerce";

function formatAmount(value: number, currency: string) {
  return `${new Intl.NumberFormat("pt-AO").format(value)} ${currency}`;
}

export default function CommerceEarningsPage() {
  const { dict, locale } = useI18n();
  const [summary, setSummary] = useState<SellerEarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const copy = dict.commerceEarnings;
  const dateLocale = locale === "en" ? "en-GB" : locale === "fr" ? "fr-FR" : "pt-AO";

  useEffect(() => {
    getSellerEarningsAction()
      .then((result) => setSummary(result))
      .catch(() => setSummary(null))
      .finally(() => setIsLoading(false));
  }, []);

  const completedEntries = useMemo(
    () => (summary?.entries || []).filter((entry) => entry.status === "completed"),
    [summary]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">{copy.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">{copy.subtitle}</p>
        </div>
        <Link href="/dashboard/orders">
          <Button variant="outline" size="sm" className="gap-2">
            <span>{dict.navDash.receivedOrders}</span>
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-card rounded-2xl border border-border p-6 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">{copy.totalEarned}</span>
          <p className="text-2xl font-black text-foreground">
            {isLoading ? "—" : formatAmount(summary?.total_earned || 0, summary?.currency || "AOA")}
          </p>
        </div>
        <div className="bg-surface-card rounded-2xl border border-border p-6 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">{copy.completedOrders}</span>
          <p className="text-2xl font-black text-foreground">
            {isLoading ? "—" : formatAmount(summary?.total_earned || 0, summary?.currency || "AOA")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isLoading ? "" : summary?.completed_count || 0}
          </p>
        </div>
        <div className="bg-surface-card rounded-2xl border border-border p-6 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">{copy.processing}</span>
          <p className="text-2xl font-black text-foreground">
            {isLoading ? "—" : formatAmount(summary?.total_processing || 0, summary?.currency || "AOA")}
          </p>
        </div>
      </div>

      {!isLoading && completedEntries.length > 0 ? (
        <div className="bg-surface-card rounded-2xl border border-border p-6 space-y-4">
          <h2 className="text-sm font-bold text-foreground">{copy.completedList}</h2>
          <div className="divide-y divide-border">
            {completedEntries.map((entry, index) => (
              <div key={`${entry.order_number}-${entry.created_at}-${index}`} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                <div>
                  <Link
                    href={`/orders/${entry.order_number}`}
                    className="text-xs font-mono font-bold text-primary hover:underline"
                  >
                    {entry.order_number}
                  </Link>
                  {entry.created_at ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(entry.created_at).toLocaleDateString(dateLocale)}
                    </p>
                  ) : null}
                </div>
                <span className="text-sm font-black text-foreground">
                  {formatAmount(entry.total, summary?.currency || "AOA")}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!isLoading && (summary?.entries.length || 0) === 0 ? (
        <div className="bg-surface-card rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
          {copy.empty}
        </div>
      ) : null}
    </div>
  );
}
