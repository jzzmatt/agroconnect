"use client";

import React, { useRef, useState } from "react";
import { Film, Trash2, AlertCircle, Scissors, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { localizeError } from "@/i18n/errors";
import { PRODUCT_VIDEO_MAX_SECONDS } from "@/config/product-catalog";
import { readVideoDuration } from "@/lib/products/compress-image";
import {
  clampTrimWindow,
  needsProductVideoTrim,
  validateProductVideoSource,
} from "@/lib/products/video-validation";
import {
  formatBytes,
  formatClock,
  optimizeProductVideo,
  type VideoOptimizeProgress,
} from "@/lib/products/video-optimizer";

export type PendingProductVideo = {
  file: File;
  previewUrl: string;
  duration: number;
  fileSize: number;
  originalSize?: number;
  optimized?: boolean;
};

type UploaderPhase =
  | "idle"
  | "info"
  | "trim"
  | "processing"
  | "ready"
  | "error";

export function ProductVideoUploader({
  video,
  onChange,
}: {
  video: PendingProductVideo | null;
  onChange: (next: PendingProductVideo | null) => void;
}) {
  const { dict } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<UploaderPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<VideoOptimizeProgress>("analyzing");
  const [source, setSource] = useState<{ file: File; duration: number } | null>(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(PRODUCT_VIDEO_MAX_SECONDS);

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const cancelWork = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const closeModals = () => {
    setPhase(video ? "ready" : "idle");
    setSource(null);
    resetInput();
  };

  const handlePickClick = () => {
    setError(null);
    setPhase("info");
  };

  const handleChooseFromInfo = () => {
    inputRef.current?.click();
  };

  const applyOptimized = (file: File, duration: number, originalSize: number, optimizedSize: number) => {
    if (video?.previewUrl) URL.revokeObjectURL(video.previewUrl);
    onChange({
      file,
      previewUrl: URL.createObjectURL(file),
      duration,
      fileSize: optimizedSize,
      originalSize,
      optimized: true,
    });
    setPhase("ready");
    setSource(null);
    resetInput();
  };

  const processFile = async (file: File, startSeconds: number, endSeconds: number) => {
    setPhase("processing");
    setProgress("analyzing");
    cancelWork();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const optimized = await optimizeProductVideo(file, {
        startSeconds,
        endSeconds,
        signal: controller.signal,
        onProgress: setProgress,
      });
      applyOptimized(optimized.file, optimized.duration, optimized.originalSize, optimized.optimizedSize);
    } catch (err: any) {
      if (err?.message === "video_optimize_cancelled") {
        setPhase(source ? "trim" : "idle");
        return;
      }
      setError(dict.errors.VIDEO_OPTIMIZE_FAILED);
      setPhase("error");
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const sourceCheck = validateProductVideoSource({
      mimeType: file.type,
      fileSize: file.size,
      fileName: file.name,
    });
    if (!sourceCheck.ok) {
      setError(localizeError(dict, sourceCheck.code, sourceCheck.error));
      setPhase("error");
      resetInput();
      return;
    }

    try {
      const duration = await readVideoDuration(file);
      if (!duration || Number.isNaN(duration)) {
        setError(dict.errors.PRODUCT_VIDEO_INVALID);
        setPhase("error");
        return;
      }
      if (needsProductVideoTrim(duration)) {
        setSource({ file, duration });
        setStart(0);
        setEnd(PRODUCT_VIDEO_MAX_SECONDS);
        setPhase("trim");
        return;
      }
      await processFile(file, 0, duration);
    } catch {
      setError(dict.errors.PRODUCT_VIDEO_INVALID);
      setPhase("error");
    }
  };

  const trimWindow = source
    ? clampTrimWindow(start, end, source.duration)
    : { start: 0, end: PRODUCT_VIDEO_MAX_SECONDS };

  const progressLabel = {
    analyzing: dict.products.videoAnalyzing,
    trimming: dict.products.videoTrimming,
    optimizing: dict.products.videoOptimizing,
    preparing: dict.products.videoPreparing,
    ready: dict.products.videoReady,
  }[progress];

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold text-foreground block mb-1" htmlFor="product-video">
          {dict.products.videoLabel} <span className="text-muted-foreground">({dict.common.optional})</span>
        </label>
        <p className="text-[11px] text-muted-foreground">{dict.products.videoHelper}</p>
      </div>

      <input
        id="product-video"
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {!video ? (
        <Button type="button" variant="outline" onClick={handlePickClick} className="gap-2">
          <Film className="w-4 h-4" />
          <span>{dict.products.videoAdd}</span>
        </Button>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-3 space-y-2">
          <video
            src={video.previewUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-56 rounded-xl bg-black"
          />
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <p className="font-bold truncate">{video.file.name}</p>
              <p className="text-muted-foreground">
                {formatClock(video.duration)} · {dict.products.videoOriginal}: {formatBytes(video.originalSize || video.fileSize)}
                {video.optimized ? ` · ${dict.products.videoOptimized}: ${formatBytes(video.fileSize)}` : ""}
                {" · "}max {PRODUCT_VIDEO_MAX_SECONDS}s
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                cancelWork();
                if (video.previewUrl) URL.revokeObjectURL(video.previewUrl);
                onChange(null);
                setPhase("idle");
              }}
              className="gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{dict.common.remove}</span>
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive font-semibold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      {phase === "error" && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => source ? processFile(source.file, trimWindow.start, trimWindow.end) : handlePickClick()}>
            {dict.common.retry}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handlePickClick}>
            {dict.products.videoChooseOther}
          </Button>
        </div>
      )}

      {phase === "info" && (
        <ModalShell onClose={closeModals}>
          <h3 className="text-base font-black text-foreground">{dict.products.videoIntroTitle}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{dict.products.videoIntroBody}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" onClick={handleChooseFromInfo}>{dict.products.videoChoose}</Button>
            <Button type="button" variant="outline" onClick={closeModals}>{dict.common.cancel}</Button>
          </div>
        </ModalShell>
      )}

      {phase === "trim" && source && (
        <ModalShell onClose={closeModals}>
          <h3 className="text-base font-black text-foreground">{dict.products.videoExceeds}</h3>
          <p className="text-xs text-muted-foreground">
            {dict.products.videoDuration}: {formatClock(source.duration)}
          </p>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${Math.min(100, (PRODUCT_VIDEO_MAX_SECONDS / source.duration) * 100)}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="space-y-1">
              <span className="font-bold">{dict.products.videoStart}</span>
              <input
                type="range"
                min={0}
                max={Math.max(0, source.duration - 1)}
                step={0.5}
                value={trimWindow.start}
                onChange={(event) => {
                  const nextStart = Number(event.target.value);
                  const next = clampTrimWindow(nextStart, nextStart + PRODUCT_VIDEO_MAX_SECONDS, source.duration);
                  setStart(next.start);
                  setEnd(next.end);
                }}
              />
              <span>{formatClock(trimWindow.start)}</span>
            </label>
            <label className="space-y-1">
              <span className="font-bold">{dict.products.videoEnd}</span>
              <input
                type="range"
                min={1}
                max={source.duration}
                step={0.5}
                value={trimWindow.end}
                onChange={(event) => {
                  const nextEnd = Number(event.target.value);
                  const next = clampTrimWindow(nextEnd - PRODUCT_VIDEO_MAX_SECONDS, nextEnd, source.duration);
                  setStart(next.start);
                  setEnd(next.end);
                }}
              />
              <span>{formatClock(trimWindow.end)}</span>
            </label>
          </div>
          <p className="text-[11px] font-semibold text-primary">
            {formatClock(trimWindow.end - trimWindow.start)} / 01:00
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-1">
            <Button type="button" onClick={() => processFile(source.file, 0, PRODUCT_VIDEO_MAX_SECONDS)} className="gap-1.5">
              <Scissors className="w-3.5 h-3.5" />
              {dict.products.videoUseFirstMinute}
            </Button>
            <Button type="button" variant="outline" onClick={() => processFile(source.file, trimWindow.start, trimWindow.end)}>
              {dict.products.videoApplyTrim}
            </Button>
            <Button type="button" variant="outline" onClick={handlePickClick}>
              {dict.products.videoChooseOther}
            </Button>
          </div>
        </ModalShell>
      )}

      {phase === "processing" && (
        <ModalShell>
          <div className="flex items-center gap-2 text-sm font-bold">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            {progressLabel}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => { cancelWork(); closeModals(); }}>
            {dict.common.cancel}
          </Button>
        </ModalShell>
      )}
    </div>
  );
}

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface-elevated border border-border rounded-3xl p-5 space-y-3 shadow-xl">
        {children}
      </div>
    </div>
  );
}
