"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";

export function ProductThumbnailOfferModal({
  open,
  generating,
  percent,
  error,
  onAccept,
  onDecline,
  onDismiss,
  onRetry,
}: {
  open: boolean;
  generating: boolean;
  percent: number | null;
  error: string | null;
  onAccept: () => void;
  onDecline: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  const { dict } = useI18n();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-thumbnail-offer-title"
        className="w-full max-w-md space-y-4 rounded-3xl bg-surface-card p-5"
      >
        <div className="space-y-2">
          <h2 id="product-thumbnail-offer-title" className="text-lg font-black">
            {dict.products.thumbnailOfferTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{dict.products.thumbnailOfferBody}</p>
        </div>
        {generating && percent !== null ? (
          <div className="space-y-1" role="status" aria-live="polite">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>{dict.products.thumbnailGenerating}</span>
              <span>{dict.products.thumbnailGenerationProgress.replace("{percent}", String(percent))}</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={dict.products.thumbnailGenerating}
            >
              <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        ) : null}
        {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          {error ? (
            <>
              <Button type="button" variant="outline" onClick={onDecline}>
                {dict.products.thumbnailContinueWithout}
              </Button>
              <Button type="button" onClick={onRetry}>
                {dict.products.thumbnailRetry}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" disabled={generating} onClick={onDismiss}>
                {dict.common.close}
              </Button>
              <Button type="button" variant="outline" disabled={generating} onClick={onDecline}>
                {dict.products.thumbnailNo}
              </Button>
              <Button type="button" disabled={generating} onClick={onAccept} className="gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{dict.products.thumbnailYes}</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
