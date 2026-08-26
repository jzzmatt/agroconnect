"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { YouTubePlayer } from "@/components/academy/YouTubePlayer";
import { buildYouTubeEmbedUrl, extractYouTubeVideoId } from "@/lib/academy/youtube";
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
  const videoId = extractYouTubeVideoId(value);
  const embedUrl = buildYouTubeEmbedUrl(videoId);

  useEffect(() => {
    if (open) setValue(initialUrl ?? "");
  }, [open, initialUrl]);

  if (!open) return null;

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
        {value.trim() && !videoId ? (
          <p className="text-[11px] font-semibold text-destructive">{dict.agriacademy.youtubeUrlInvalid}</p>
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
            disabled={!videoId}
            onClick={() => {
              if (!videoId) return;
              onSave(value.trim());
            }}
          >
            {dict.agriacademy.saveYouTubeUrl}
          </Button>
        </div>
      </div>
    </div>
  );
}
