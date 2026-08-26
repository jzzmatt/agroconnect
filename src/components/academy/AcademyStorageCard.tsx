"use client";

import React from "react";
import { HardDrive } from "lucide-react";
import { getStorageWarningLevel } from "@/lib/services/pricing-service";
import { useI18n } from "@/i18n/provider";

export function AcademyStorageCard({
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
  const { dict } = useI18n();
  const level = getStorageWarningLevel(usedBytes, limitBytes);
  const barColor =
    level === "full" || level === "critical"
      ? "bg-destructive"
      : level === "warn"
        ? "bg-amber-500"
        : "bg-primary";

  const warningMessage =
    level === "full"
      ? dict.agriacademy.storageLimitReached
      : level === "critical" || level === "warn"
        ? dict.agriacademy.storageAlmostFull
        : null;

  return (
    <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <HardDrive className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-foreground">{dict.agriacademy.storageUsage}</h3>
          <p className="text-xs text-muted-foreground">
            {dict.agriacademy.storageUsed}: {usedLabel} · {dict.agriacademy.storageAvailable}: {limitLabel}
          </p>
        </div>
      </div>
      <div
        className="h-2 rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs font-semibold text-muted-foreground">{percent}%</p>
      {warningMessage && (
        <p
          className={`text-xs font-semibold ${
            level === "full" ? "text-destructive" : "text-amber-700 dark:text-amber-300"
          }`}
        >
          {warningMessage}
        </p>
      )}
    </div>
  );
}
