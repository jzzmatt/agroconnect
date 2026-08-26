"use client";

import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";

export function CourseConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant = "primary",
  loading = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "destructive";
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { dict } = useI18n();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={loading ? undefined : onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-confirm-title"
        className="relative w-full max-w-md bg-surface-elevated border border-border rounded-3xl p-5 space-y-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id="course-confirm-title" className="text-base font-black">
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label={dict.common.close}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel || dict.common.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? dict.common.loading : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
