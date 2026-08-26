"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { YouTubePlayer } from "@/components/academy/YouTubePlayer";
import {
  analyzeYouTubeInput,
  buildYouTubeEmbedUrl,
  buildYouTubeThumbnailUrl,
} from "@/lib/academy/youtube";
import { useI18n } from "@/i18n/provider";

export function LessonYouTubeModal({
  open,
  initialUrl,
  onClose,
  onSave,
}: {
  open: boolean;
  initialUrl?: string | null;
  onClose: () => void;
  onSave: (urlOrId: string) => void;
}) {
  const { dict } = useI18n();
  const [value, setValue] = useState(initialUrl ?? "");
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const analysis = analyzeYouTubeInput(value);
  const videoId = analysis.ok ? analysis.videoId : null;
  const embedUrl = buildYouTubeEmbedUrl(videoId);
  const thumbnailUrl = buildYouTubeThumbnailUrl(videoId);

  useEffect(() => {
    if (open) {
      setValue(initialUrl ?? "");
      setThumbnailFailed(false);
    }
  }, [open, initialUrl]);

  if (!open) return null;

  const invalidReason = (() => {
    if (!value.trim() || analysis.ok) return null;
    switch (analysis.reason) {
      case "channel":
        return dict.agriacademy.youtubeUrlChannel;
      case "playlist":
        return dict.agriacademy.youtubeUrlPlaylist;
      case "not_youtube":
        return dict.agriacademy.youtubeUrlNotYouTube;
      default:
        return dict.agriacademy.youtubeUrlMalformed;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-4 space-y-3">
        <h2 className="text-sm font-black">{dict.agriacademy.youtubeUrlLabel}</h2>
        <p className="text-[11px] text-muted-foreground">{dict.agriacademy.youtubeUnlistedHint}</p>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={dict.agriacademy.youtubeUrlPlaceholder}
          className="w-full text-sm rounded-lg border border-border bg-transparent px-3 py-2 focus:outline-none"
        />
        {invalidReason ? (
          <p className="text-[11px] font-semibold text-destructive">{invalidReason}</p>
        ) : null}
        {videoId ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2">
            {thumbnailUrl && !thumbnailFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl}
                alt={dict.agriacademy.youtubeThumbnailAlt}
                className="h-16 w-28 rounded-lg object-cover border border-border"
                onError={() => setThumbnailFailed(true)}
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground">
                {dict.agriacademy.youtubeVideoIdLabel}
              </p>
              <p className="text-sm font-bold truncate">{videoId}</p>
            </div>
          </div>
        ) : null}
        <YouTubePlayer
          embedUrl={embedUrl}
          title={dict.agriacademy.preview}
          ready={Boolean(embedUrl)}
          pendingLabel={dict.agriacademy.youtubePreviewPending}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            {dict.agriacademy.closePreview}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!analysis.ok}
            onClick={() => {
              if (!analysis.ok) return;
              onSave(analysis.normalizedUrl);
            }}
          >
            {dict.agriacademy.saveYouTubeUrl}
          </Button>
        </div>
      </div>
    </div>
  );
}
