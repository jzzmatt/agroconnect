"use client";

import { Button } from "@/components/ui/Button";

const SAFE_QR = /^data:image\/(?:png|jpeg);base64,[a-z0-9+/=\s]+$/i;

export function isDisplayableQr(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length < 600_000 && SAFE_QR.test(value);
}

export function QrConnectModal({
  open,
  title,
  help,
  waiting,
  expired,
  closeLabel,
  regenerateLabel,
  qrCode,
  busy,
  onClose,
  onRegenerate,
}: {
  open: boolean;
  title: string;
  help: string;
  waiting: string;
  expired: string;
  closeLabel: string;
  regenerateLabel: string;
  qrCode: string | null;
  busy: boolean;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  if (!open) return null;
  const image = isDisplayableQr(qrCode) ? qrCode : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-qr-title"
        className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-lg"
      >
        <h2 id="whatsapp-qr-title" className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{help}</p>
        <div className="mt-4 flex min-h-48 items-center justify-center rounded-xl bg-white p-3">
          {image ? (
            <img
              src={image}
              alt={title}
              className="h-auto w-full max-w-[280px]"
            />
          ) : (
            <p className="text-center text-sm text-muted-foreground">{waiting}</p>
          )}
        </div>
        {expired ? <p className="mt-3 text-sm text-muted-foreground">{expired}</p> : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="w-full" onClick={onRegenerate} disabled={busy}>
            {regenerateLabel}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
