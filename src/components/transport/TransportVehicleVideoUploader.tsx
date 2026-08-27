"use client";

import React, { useRef, useState } from "react";
import { Film, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { readVideoDuration } from "@/lib/products/compress-image";
import { TRANSPORT_VIDEO_MAX_SECONDS } from "@/lib/transport/constants";
import {
  clampTransportTrimWindow,
  needsTransportVideoTrim,
  validateTransportVideoSource,
} from "@/lib/transport/video-validation";
import {
  formatBytes,
  formatClock,
  optimizeProductVideo,
} from "@/lib/products/video-optimizer";

export type PendingTransportVideo = {
  file: File;
  previewUrl: string;
  duration: number;
  fileSize: number;
};

export function TransportVehicleVideoUploader({
  video,
  onChange,
  disabled,
}: {
  video: PendingTransportVideo | null;
  onChange: (next: PendingTransportVideo | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const sourceCheck = validateTransportVideoSource({
      mimeType: file.type,
      fileSize: file.size,
      fileName: file.name,
    });
    if (!sourceCheck.ok) {
      setError(sourceCheck.error);
      return;
    }

    try {
      const duration = await readVideoDuration(file);
      if (!duration || Number.isNaN(duration)) {
        setError("Não foi possível ler a duração do vídeo.");
        return;
      }

      setProcessing(true);
      const window =
        duration > TRANSPORT_VIDEO_MAX_SECONDS
          ? { start: 0, end: TRANSPORT_VIDEO_MAX_SECONDS }
          : clampTransportTrimWindow(0, duration, duration);

      const optimized = await optimizeProductVideo(file, {
        startSeconds: window.start,
        endSeconds: window.end,
      });

      if (video?.previewUrl) URL.revokeObjectURL(video.previewUrl);
      onChange({
        file: optimized.file,
        previewUrl: URL.createObjectURL(optimized.file),
        duration: optimized.duration,
        fileSize: optimized.optimizedSize,
      });
    } catch {
      setError("Falha ao processar o vídeo. Utilize MP4 ou WebM com até 30 segundos.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-bold text-muted-foreground">
          Vídeo curto do veículo <span className="font-normal">(opcional, máx. 30s)</span>
        </label>
        <p className="text-[11px] text-muted-foreground">
          Mostre o veículo em movimento ou os detalhes da carroçaria. O vídeo será otimizado antes do envio.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!video ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled || processing}
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          <Film className="w-4 h-4" />
          {processing ? "A processar..." : "Adicionar vídeo"}
        </Button>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-3 space-y-2">
          <video src={video.previewUrl} controls playsInline className="w-full max-h-48 rounded-xl bg-black" />
          <div className="flex items-center justify-between gap-2 text-xs">
            <div>
              <p className="font-bold truncate">{video.file.name}</p>
              <p className="text-muted-foreground">
                {formatClock(video.duration)} · {formatBytes(video.fileSize)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => {
                URL.revokeObjectURL(video.previewUrl);
                onChange(null);
              }}
              className="gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remover
            </Button>
          </div>
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
