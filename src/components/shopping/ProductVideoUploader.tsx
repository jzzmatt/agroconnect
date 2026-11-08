"use client";

import React, { useRef, useState } from "react";
import { Camera, Film, Trash2, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { localizeError } from "@/i18n/errors";
import { PRODUCT_VIDEO_MAX_SECONDS } from "@/config/product-catalog";
import { readVideoDuration } from "@/lib/products/compress-image";
import { validateProductVideoSource } from "@/lib/products/video-validation";
import { keepsOriginalFile } from "@/lib/products/temp-video-lifecycle";
import { formatBytes, formatClock, optimizeProductVideo } from "@/lib/products/video-optimizer";

export type PendingProductVideo = {
  file: File;
  previewUrl: string;
  duration: number;
  fileSize: number;
  originalSize?: number;
  optimized?: boolean;
};

export function ProductVideoUploader({
  video,
  onChange,
  onSave,
  saveState,
  uploadPercent,
}: {
  video: PendingProductVideo | null;
  onChange: (video: PendingProductVideo | null) => void;
  onSave: (file: File, duration: number) => Promise<void>;
  saveState: "idle" | "saving" | "saved" | "error";
  uploadPercent: number | null;
}) {
  const { dict } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const working = useRef(false);
  const [source, setSource] = useState<File | null>(video?.file || null);
  const [duration, setDuration] = useState(video?.duration || 0);
  const [phase, setPhase] = useState<"idle" | "processing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const busy = phase === "processing" || saveState === "saving";

  async function handleFile(file: File | undefined) {
    if (!file || busy) return;
    const sourceCheck = validateProductVideoSource({
      mimeType: file.type,
      fileSize: file.size,
      fileName: file.name,
    });
    if (!sourceCheck.ok) {
      setError(localizeError(dict, sourceCheck.code));
      return;
    }
    setError(null);
    setPhase("processing");
    try {
      const seconds = await readVideoDuration(file);
      if (video?.previewUrl) URL.revokeObjectURL(video.previewUrl);
      const previewUrl = URL.createObjectURL(file);
      setSource(file);
      setDuration(seconds);
      onChange({
        file,
        previewUrl,
        duration: seconds,
        fileSize: file.size,
        originalSize: file.size,
        optimized: false,
      });
      setPhase("idle");
    } catch (err) {
      setPhase("error");
      setError(localizeError(dict, err instanceof Error ? err.message : "PRODUCT_VIDEO_INVALID"));
    }
  }

  async function saveVideo() {
    if (!source || busy || working.current || saveState === "saved") return;
    working.current = true;
    setError(null);
    setPhase("processing");
    try {
      let file = source;
      let seconds = duration;
      if (!keepsOriginalFile(duration, source.type)) {
        const processed = await optimizeProductVideo(source, {
          startSeconds: 0,
          endSeconds: Math.min(duration, PRODUCT_VIDEO_MAX_SECONDS),
        });
        file = processed.file;
        seconds = processed.duration;
        if (video?.previewUrl) URL.revokeObjectURL(video.previewUrl);
        onChange({
          file,
          previewUrl: URL.createObjectURL(file),
          duration: seconds,
          fileSize: file.size,
          originalSize: source.size,
          optimized: true,
        });
      }
      await onSave(file, seconds);
      setPhase("idle");
    } catch (err) {
      setPhase("error");
      setError(localizeError(dict, err instanceof Error ? err.message : "TEMP_VIDEO_FAILED"));
    } finally {
      working.current = false;
    }
  }

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />
      <input ref={cameraRef} type="file" accept="video/*" capture="environment" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />

      {!video ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
            <Film className="w-4 h-4" />
            <span>{dict.products.videoAdd}</span>
          </Button>
          <Button type="button" variant="outline" onClick={() => cameraRef.current?.click()} className="gap-2">
            <Camera className="w-4 h-4" />
            <span>{dict.products.captureVideo}</span>
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-3 space-y-2">
          <video src={video.previewUrl} controls playsInline preload="metadata" className="w-full max-h-56 rounded-xl bg-black" />
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <p className="font-bold truncate">{video.file.name}</p>
              <p className="text-muted-foreground">
                {formatClock(video.duration)} · {formatBytes(video.fileSize)} · max {PRODUCT_VIDEO_MAX_SECONDS}s
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (video.previewUrl) URL.revokeObjectURL(video.previewUrl);
                setSource(null);
                onChange(null);
              }}
              className="gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{dict.common.remove}</span>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" disabled={busy || saveState === "saved"} onClick={() => void saveVideo()}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{dict.products.saveVideo}</span>
            </Button>
            {saveState === "saved" ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {dict.products.videoSaved}
              </span>
            ) : null}
          </div>
          {saveState === "saving" && uploadPercent !== null ? (
            <div className="space-y-1" role="status" aria-live="polite">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>{dict.products.videoSaving}</span>
                <span>{dict.products.uploadProgress.replace("{percent}", String(uploadPercent))}</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadPercent}
                aria-label={dict.products.videoSaving}
              >
                <div className="h-full bg-primary transition-all" style={{ width: `${uploadPercent}%` }} />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="text-xs text-destructive font-semibold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
