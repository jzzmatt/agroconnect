"use client";

import React from "react";
import { HardDrive } from "lucide-react";
import { getStorageWarningLevel } from "@/lib/services/pricing-service";

export function VideoStorageMeter({
  usedBytes,
  limitBytes,
  usedLabel,
  limitLabel,
  percent,
}: {
  usedBytes: number;
  limitBytes: number;
  usedLabel: string;
  limitLabel: string;
  percent: number;
}) {
  const level = getStorageWarningLevel(usedBytes, limitBytes);
  const barColor =
    level === "full" || level === "critical"
      ? "bg-destructive"
      : level === "warn"
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <HardDrive className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-foreground">Armazenamento de vídeos</h3>
          <p className="text-xs text-muted-foreground">
            {usedLabel} / {limitLabel}
          </p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
      {level === "warn" && (
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          Está a utilizar 80% do armazenamento disponível.
        </p>
      )}
      {level === "critical" && (
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          Está a utilizar 90% do armazenamento disponível.
        </p>
      )}
      {level === "full" && (
        <p className="text-xs font-semibold text-destructive">Limite de armazenamento atingido.</p>
      )}
    </div>
  );
}
