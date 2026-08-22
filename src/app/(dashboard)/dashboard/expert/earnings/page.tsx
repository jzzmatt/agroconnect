"use client";

import React from "react";
import Link from "next/link";
import { DollarSign, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";

export default function ExpertEarningsPage() {
  const { dict } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">{dict.navDash.earnings}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Resumo de receitas dos seus serviços de consultoria e assistência técnica.
          </p>
        </div>
        <Link href="/dashboard/requests">
          <Button variant="outline" size="sm" className="gap-2">
            <span>{dict.navDash.serviceRequests}</span>
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-card rounded-2xl border border-border p-6 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Total Ganho</span>
          <p className="text-2xl font-black text-foreground">0 Kz</p>
        </div>
        <div className="bg-surface-card rounded-2xl border border-border p-6 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Pedidos Concluídos</span>
          <p className="text-2xl font-black text-foreground">0</p>
        </div>
        <div className="bg-surface-card rounded-2xl border border-border p-6 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Em Processamento</span>
          <p className="text-2xl font-black text-foreground">0 Kz</p>
        </div>
      </div>
    </div>
  );
}
