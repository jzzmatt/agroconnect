"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";

interface PreviewGroup {
  id: string;
  name: string;
}

interface PreviewPayload {
  message: string;
  product: {
    id: string;
    name: string;
    description: string | null;
    priceKz: number;
    location: string;
    transportIncluded: boolean;
    imageUrl: string | null;
    thumbnailUrl?: string | null;
    videoUrl: string | null;
    orderUrl: string;
    listingUrl: string;
  };
  connection: { status: string; phone: string | null };
  groups: PreviewGroup[];
}

interface PublicationTarget {
  id: string;
  groupId: string;
  groupName: string;
  status: "pending" | "processing" | "sent" | "failed";
  errorCode: string | null;
}

interface PublicationRecord {
  id: string;
  status: string;
  targets: PublicationTarget[];
}

function requestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `pub-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function WhatsAppPublishModal({
  open,
  productId,
  onClose,
}: {
  open: boolean;
  productId: string | null;
  onClose: () => void;
}) {
  const { dict } = useI18n();
  const copy = dict.whatsapp;
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publication, setPublication] = useState<PublicationRecord | null>(null);
  const [sending, setSending] = useState(false);
  const clientRequestId = useRef(requestId());
  const sendingLock = useRef(false);

  const load = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/whatsapp/products/${id}/preview`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.product) {
        setError(copy.errorGeneric);
        setPreview(null);
        return;
      }
      setPreview(payload as PreviewPayload);
      setSelected((current) => current.filter((groupId) => payload.groups?.some((group: PreviewGroup) => group.id === groupId)));
    } catch {
      setError(copy.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !productId) return;
    clientRequestId.current = requestId();
    setPublication(null);
    setSelected([]);
    void load(productId);
    // The dictionary object is stable for the session locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const groups = preview?.groups ?? [];
  const allSelected = groups.length > 0 && groups.every((group) => selected.includes(group.id));
  const connected = preview?.connection.status === "connected";
  const price = useMemo(() => {
    if (!preview) return "";
    return `${new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 2 }).format(preview.product.priceKz)} Kz`;
  }, [preview]);

  const toggle = (groupId: string) => {
    setSelected((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]
    );
  };

  const publish = async () => {
    if (!productId || !preview || sendingLock.current || selected.length === 0) return;
    if (publication?.id) {
      if (publication.targets.some((target) => target.status === "failed")) await retry();
      return;
    }
    sendingLock.current = true;
    setSending(true);
    setError(null);
    setPublication({
      id: "",
      status: "processing",
      targets: selected.map((groupId) => ({
        id: groupId,
        groupId,
        groupName: groups.find((group) => group.id === groupId)?.name || copy.groupsTitle,
        status: "processing",
        errorCode: null,
      })),
    });
    try {
      const response = await fetch(`/api/whatsapp/products/${productId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ groupIds: selected, clientRequestId: clientRequestId.current }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.publication) {
        setError(response.status === 429 ? copy.errorRate : copy.publishFailed);
        setPublication(null);
        return;
      }
      setPublication(payload.publication as PublicationRecord);
    } catch {
      setError(copy.publishFailed);
      setPublication(null);
    } finally {
      sendingLock.current = false;
      setSending(false);
    }
  };

  const retry = async () => {
    if (!publication?.id || sendingLock.current) return;
    sendingLock.current = true;
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/whatsapp/publications/${publication.id}/retry`, {
        method: "POST",
        credentials: "same-origin",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.publication) {
        setError(copy.publishFailed);
        return;
      }
      setPublication(payload.publication as PublicationRecord);
    } catch {
      setError(copy.publishFailed);
    } finally {
      sendingLock.current = false;
      setSending(false);
    }
  };

  if (!open || !productId) return null;
  const failed = publication?.targets.some((target) => target.status === "failed") ?? false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-publish-title"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-surface-card p-5 shadow-lg space-y-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 -mx-5 flex items-start justify-between gap-3 bg-surface-card px-5 pb-3">
          <h2 id="whatsapp-publish-title" className="text-lg font-black text-foreground">
            {copy.publishTitle}
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {copy.close}
          </Button>
        </div>

        {loading && <p className="text-xs text-muted-foreground">{copy.loading}</p>}
        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

        {preview && (
          <>
            <div className="flex gap-3">
              {preview.product.imageUrl ? (
                <img
                  src={preview.product.imageUrl}
                  alt=""
                  className="h-16 w-16 rounded-2xl object-cover bg-muted"
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-muted" />
              )}
              {preview.product.thumbnailUrl ? (
                <img
                  src={preview.product.thumbnailUrl}
                  alt={copy.videoLink}
                  className="h-16 w-16 rounded-2xl object-cover bg-muted"
                />
              ) : null}
              <div className="min-w-0 text-xs space-y-1">
                <p className="font-black text-sm text-foreground">{preview.product.name}</p>
                {preview.product.description ? <p className="text-muted-foreground">{preview.product.description}</p> : null}
                <p className="font-bold">{price}</p>
                {preview.product.location ? <p>{preview.product.location}</p> : null}
                <p>{preview.product.transportIncluded ? copy.transportIncluded : copy.transportExcluded}</p>
                {preview.product.videoUrl ? (
                  <a href={preview.product.videoUrl} className="font-bold text-primary" target="_blank" rel="noreferrer">
                    {copy.videoLink}
                  </a>
                ) : null}
                <a href={preview.product.listingUrl} className="block break-all font-bold text-primary">
                  {preview.product.listingUrl}
                </a>
                <a href={preview.product.orderUrl} className="block break-all font-bold text-primary">
                  {preview.product.orderUrl}
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-3 text-xs space-y-1">
              <p className="font-bold">{copy.accountLabel}</p>
              <p>
                {connected ? copy.statusConnected : copy.statusDisconnected}
                {preview.connection.phone ? ` · ${preview.connection.phone}` : ""}
              </p>
              {!connected && (
                <Link href="/dashboard/whatsapp" className="font-bold text-primary">
                  {copy.openIntegration}
                </Link>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-primary">{copy.groupsTitle}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void load(productId)}>
                  {copy.refreshGroups}
                </Button>
              </div>
              {groups.length === 0 ? (
                <p className="text-xs text-muted-foreground">{copy.noGroups}</p>
              ) : (
                <>
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? [] : groups.map((group) => group.id))}
                    />
                    {copy.selectAll}
                  </label>
                  <ul className="space-y-2">
                    {groups.map((group) => (
                      <li key={group.id}>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={selected.includes(group.id)}
                            onChange={() => toggle(group.id)}
                          />
                          <span className="font-semibold">{group.name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="space-y-2 rounded-2xl bg-surface p-3">
              {preview.product.thumbnailUrl ? (
                <img
                  src={preview.product.thumbnailUrl}
                  alt={copy.thumbnailPreview}
                  className="max-h-56 w-full rounded-2xl object-cover bg-muted"
                />
              ) : null}
              <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">
                {preview.message}
              </pre>
            </div>

            {publication && (
              <ul className="space-y-1 text-xs">
                {publication.targets.map((target) => (
                  <li key={target.groupId} className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{target.groupName}</span>
                    <span>
                      {target.status === "sent"
                        ? copy.groupSent
                        : target.status === "failed"
                          ? copy.groupFailed
                          : copy.groupSending}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="sticky bottom-0 z-10 -mx-5 flex flex-wrap justify-end gap-2 bg-surface-card px-5 pt-3">
              <Button type="button" variant="outline" onClick={onClose}>
                {copy.close}
              </Button>
              {failed && (
                <Button type="button" variant="outline" disabled={sending} onClick={() => void retry()}>
                  {copy.retryFailed}
                </Button>
              )}
              <Button type="button" variant="primary" disabled={!connected || sending || selected.length === 0} onClick={() => void publish()}>
                {sending ? copy.publishingGroups : copy.publishGroups}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
