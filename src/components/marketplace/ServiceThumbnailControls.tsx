"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { serviceThumbnailPublicPath } from "@/lib/services/service-thumbnail";

export function ServiceThumbnailControls({ serviceId }: { serviceId: string }) {
  const { dict } = useI18n();
  const copy = dict.agriexpert;
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [savedVersion, setSavedVersion] = useState(0);
  const [busy, setBusy] = useState<"generate" | "save" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [savedVisible, setSavedVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(serviceThumbnailPublicPath(serviceId), { credentials: "same-origin" })
      .then((response) => {
        if (!cancelled) setSavedVisible(response.ok);
      })
      .catch(() => {
        if (!cancelled) setSavedVisible(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId, savedVersion]);

  const generate = async () => {
    setBusy("generate");
    setError(null);
    setSavedNote(null);
    try {
      const response = await fetch(`/api/services/${serviceId}/thumbnail/generate`, {
        method: "POST",
        credentials: "same-origin",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.previewId || !payload?.imageBase64) {
        setError(payload?.error === "OPENAI_NOT_CONFIGURED" ? copy.thumbnailNotConfigured : copy.thumbnailFailed);
        return;
      }
      setPreviewId(String(payload.previewId));
      setPreviewUrl(`data:image/jpeg;base64,${payload.imageBase64}`);
    } catch {
      setError(copy.thumbnailFailed);
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!previewId) return;
    setBusy("cancel");
    setError(null);
    try {
      await fetch(`/api/services/${serviceId}/thumbnail/cancel`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId }),
      });
      setPreviewId(null);
      setPreviewUrl(null);
    } catch {
      setError(copy.thumbnailFailed);
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!previewId) return;
    setBusy("save");
    setError(null);
    try {
      const response = await fetch(`/api/services/${serviceId}/thumbnail/save`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.url) {
        setError(copy.thumbnailFailed);
        return;
      }
      setPreviewId(null);
      setPreviewUrl(null);
      setSavedVersion((value) => value + 1);
      setSavedNote(copy.thumbnailSaved);
    } catch {
      setError(copy.thumbnailFailed);
    } finally {
      setBusy(null);
    }
  };

  const savedSrc = `${serviceThumbnailPublicPath(serviceId)}?v=${savedVersion}`;

  return (
    <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{copy.thumbnailTitle}</h3>
      {previewUrl ? (
        <img src={previewUrl} alt={copy.thumbnailPreview} className="h-48 w-48 rounded-2xl object-cover border border-border" />
      ) : savedVisible ? (
        <img src={savedSrc} alt={copy.thumbnailTitle} className="h-48 w-48 rounded-2xl object-cover border border-border" />
      ) : null}
      {busy === "generate" ? (
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {copy.thumbnailGenerating}
        </p>
      ) : null}
      {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}
      {savedNote ? <p className="text-xs font-semibold text-emerald-700">{savedNote}</p> : null}
      {previewUrl ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy !== null} onClick={() => void save()}>
            {dict.common.save}
          </Button>
          <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void cancel()}>
            {dict.common.cancel}
          </Button>
          <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void generate()}>
            {copy.thumbnailRegenerate}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void generate()}>
          {copy.generateThumbnail}
        </Button>
      )}
    </div>
  );
}
