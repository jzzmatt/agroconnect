"use client";

import React from "react";
import Link from "next/link";
import { Star, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";

export default function ExpertReviewsPage() {
  const { dict } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">{dict.navDash.reviews}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Avaliações e comentários recebidos de clientes da AgriExpert.
          </p>
        </div>
        <Link href="/dashboard/services">
          <Button variant="outline" size="sm" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            <span>{dict.navDash.myServices}</span>
          </Button>
        </Link>
      </div>

      <div className="bg-surface-card rounded-3xl border border-border p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto">
          <Star className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Ainda não tem avaliações</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          As avaliações dos clientes sobre os seus serviços prestados serão apresentadas aqui.
        </p>
      </div>
    </div>
  );
}
