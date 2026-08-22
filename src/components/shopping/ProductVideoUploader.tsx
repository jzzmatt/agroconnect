"use client";

import React, { useRef, useState } from "react";
import { Film, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { localizeError } from "@/i18n/errors";
import { PRODUCT_VIDEO_MAX_BYTES, PRODUCT_VIDEO_MAX_SECONDS } from "@/config/product-catalog";
import { readVideoDuration } from "@/lib/products/compress-image";
import { validateProductVideo } from "@/lib/products/video-validation";

export type PendingProductVideo = {
  file: File;
  previewUrl: string;
  duration: number;
  fileSize: number;
};

export function ProductVideoUploader({
  video,
  onChange,
}: {
  video: PendingProductVideo | null;
  onChange: (next: PendingProductVideo | null) => void;
}) {
  const { dict } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const duration = await readVideoDuration(file);
      const validation = validateProductVideo({
        mimeType: file.type,
        fileSize: file.size,
        durationSeconds: duration,
        fileName: file.name,
      });
      if (!validation.ok) {
        setError(localizeError(dict, validation.code, validation.error));
        return;
      }
      onChange({
        file,
        previewUrl: URL.createObjectURL(file),
        duration,
        fileSize: file.size,
      });
    } catch {
      setError(dict.errors.PRODUCT_VIDEO_INVALID);
    }
  };

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
        accept="video/mp4,video/webm"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {!video ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
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
                {formatClock(video.duration)} · {formatBytes(video.fileSize)} · max {PRODUCT_VIDEO_MAX_SECONDS}s / {Math.round(PRODUCT_VIDEO_MAX_BYTES / (1024 * 1024))} MB
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)} className="gap-1">
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
    </div>
  );
}

function formatClock(seconds: number) {
  const whole = Math.round(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
