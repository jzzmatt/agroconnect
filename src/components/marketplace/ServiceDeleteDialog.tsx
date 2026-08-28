"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import type { ServiceDeleteDialogKind } from "@/lib/services/service-delete-flow";

interface ServiceDeleteDialogProps {
  open: boolean;
  kind: ServiceDeleteDialogKind;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ServiceDeleteDialog({
  open,
  kind,
  busy = false,
  onClose,
  onConfirm,
}: ServiceDeleteDialogProps) {
  const { dict } = useI18n();
  if (!open) return null;

  const blocked = kind === "published_block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface-card rounded-3xl border border-border p-6 max-w-md w-full space-y-4">
        <h3 className="text-lg font-bold">
          {blocked ? dict.agriexpert.deletePublishedTitle : dict.agriexpert.deleteServiceTitle}
        </h3>
        <p className="text-sm text-muted-foreground">
          {blocked ? dict.agriexpert.deletePublishedBlock : dict.agriexpert.deleteServiceConfirm}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={onClose}>
            {dict.common.cancel}
          </Button>
          {blocked ? null : (
            <Button variant="primary" size="sm" disabled={busy} onClick={onConfirm}>
              {dict.agriexpert.confirmDeleteAction}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
