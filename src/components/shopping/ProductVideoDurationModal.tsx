"use client";

import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";

export function ProductVideoDurationModal({
  open,
  decision,
  seconds,
  onContinue,
  onClose,
}: {
  open: boolean;
  decision: "save" | "too_long";
  seconds: number;
  onContinue: () => void;
  onClose: () => void;
}) {
  const { dict } = useI18n();
  if (!open) return null;
  const shown = Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-video-duration-title"
        className="w-full max-w-md space-y-4 rounded-3xl bg-surface-card p-5"
      >
        <div className="space-y-2">
          <h2 id="product-video-duration-title" className="text-lg font-black">
            {dict.products.videoDurationTitle}
          </h2>
          <p className="text-sm text-muted-foreground">
            {decision === "save"
              ? dict.products.videoDurationAllowed.replace("{seconds}", shown)
              : dict.products.videoDurationTooLong}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {dict.common.close}
          </Button>
          {decision === "save" ? (
            <Button type="button" onClick={onContinue}>
              {dict.products.videoDurationContinue}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
