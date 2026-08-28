"use client";

import React, { useEffect, useState } from "react";
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
  const { dict } = useI18n();
  const [summary, setSummary] = useState<SellerEarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSellerEarningsAction()
      .then((result) => setSummary(result))
      .finally(() => setIsLoading(false));
  }, []);

  const copy = dict.commerceEarnings;

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
          <p className="text-2xl font-black text-foreground">{isLoading ? "—" : summary?.completed_count || 0}</p>
        </div>
        <div className="bg-surface-card rounded-2xl border border-border p-6 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">{copy.processing}</span>
          <p className="text-2xl font-black text-foreground">
            {isLoading ? "—" : formatAmount(summary?.total_processing || 0, summary?.currency || "AOA")}
          </p>
        </div>
      </div>

      {!isLoading && (summary?.entries.length || 0) === 0 ? (
        <div className="bg-surface-card rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
          {copy.empty}
        </div>
      ) : null}
    </div>
  );
}
