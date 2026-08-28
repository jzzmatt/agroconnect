"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import type { ProductDeleteDialogKind } from "@/lib/products/delete-flow";

interface ProductDeleteDialogProps {
  open: boolean;
  kind: ProductDeleteDialogKind;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ProductDeleteDialog({
  open,
  kind,
  busy = false,
  onClose,
  onConfirm,
}: ProductDeleteDialogProps) {
  const { dict } = useI18n();
  if (!open) return null;

  const blocked = kind === "published_block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface-card rounded-3xl border border-border p-6 max-w-md w-full space-y-4">
        <h3 className="text-lg font-bold">
          {blocked ? dict.shopping.deletePublishedTitle : dict.shopping.deleteProductTitle}
        </h3>
        <p className="text-sm text-muted-foreground">
          {blocked ? dict.shopping.deletePublishedBlock : dict.shopping.deleteProductConfirm}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={onClose}>
            {dict.common.cancel}
          </Button>
          {blocked ? null : (
            <Button variant="primary" size="sm" disabled={busy} onClick={onConfirm}>
              {dict.shopping.confirmDeleteAction}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
