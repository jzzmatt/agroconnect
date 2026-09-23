"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { YouTubePlayer } from "@/components/academy/YouTubePlayer";
import { buildYouTubeEmbedUrl } from "@/lib/academy/youtube";
import { useI18n } from "@/i18n/provider";

export type LessonVideoPreviewTarget =
  | { kind: "youtube"; title: string; youtubeId: string }
  | { kind: "upload"; title: string; lessonId: string; mimeType?: string | null };

export function LessonVideoPreviewDialog({
  target,
  onClose,
}: {
  target: LessonVideoPreviewTarget | null;
  onClose: () => void;
}) {
  const { dict } = useI18n();
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadMime, setUploadMime] = useState("video/mp4");
  const [uploadState, setUploadState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!target || target.kind !== "upload") {
      setUploadUrl(null);
      setUploadState("idle");
      return;
    }

    let cancelled = false;
    setUploadState("loading");
    setUploadUrl(null);
    setUploadMime(target.mimeType || "video/mp4");

    void fetch(`/api/academy/lessons/${target.lessonId}/video/preview`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !payload?.playbackUrl) {
          setUploadState("error");
          return;
        }
        setUploadUrl(payload.playbackUrl);
        setUploadState("ready");
      })
      .catch(() => {
        if (!cancelled) setUploadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [target]);

  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-video-preview-title"
        className="w-full max-w-2xl rounded-2xl border border-border bg-background p-4 space-y-3"
      >
        <h2 id="lesson-video-preview-title" className="text-sm font-black">
          {target.title}
        </h2>

        {target.kind === "youtube" ? (
          <YouTubePlayer
            embedUrl={buildYouTubeEmbedUrl(target.youtubeId)}
            title={target.title}
            ready
            pendingLabel={dict.common.loading}
          />
        ) : uploadState === "loading" ? (
          <div
            className="aspect-video rounded-2xl border border-border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground px-4 text-center"
            role="status"
            aria-live="polite"
          >
            {dict.common.loading}
          </div>
        ) : uploadState === "error" || !uploadUrl ? (
          <div className="aspect-video rounded-2xl border border-border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground px-4 text-center">
            {dict.agriacademy.courseEditorVideoPlaybackFailed}
          </div>
        ) : (
          <video
            controls
            playsInline
            preload="metadata"
            title={target.title}
            className="aspect-video w-full rounded-2xl border border-border bg-black"
            src={uploadUrl}
          >
            <source src={uploadUrl} type={uploadMime} />
          </video>
        )}

        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          {dict.agriacademy.closeLessonPreview}
        </Button>
      </div>
    </div>
  );
}
