"use client";

import React, { useEffect, useState } from "react";
import { YouTubePlayer } from "@/components/academy/YouTubePlayer";
import { useI18n } from "@/i18n/provider";
import { isAllowedYouTubeEmbedUrl } from "@/lib/academy/youtube";

type PlaybackPayload =
  | { allowed: true; source: "youtube"; embedUrl: string }
  | { allowed: true; source: "upload"; playbackUrl: string; mimeType?: string }
  | { allowed: false };

export function ProtectedLessonPlayer({
  lessonId,
  title,
  enabled,
}: {
  lessonId: string;
  title: string;
  enabled: boolean;
}) {
  const { dict } = useI18n();
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadMime, setUploadMime] = useState<string>("video/mp4");
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setEmbedUrl(null);
      setUploadUrl(null);
      setReady(false);
      setDenied(false);
      return;
    }

    let cancelled = false;
    void fetch(`/api/academy/lessons/${lessonId}/playback`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (res) => {
        const payload = (await res.json().catch(() => null)) as PlaybackPayload | null;
        if (cancelled) return;
        if (!res.ok || !payload?.allowed) {
          setDenied(true);
          setReady(false);
          setEmbedUrl(null);
          setUploadUrl(null);
          return;
        }

        if (payload.source === "upload" && payload.playbackUrl) {
          setUploadUrl(payload.playbackUrl);
          setUploadMime(payload.mimeType || "video/mp4");
          setEmbedUrl(null);
          setReady(true);
          setDenied(false);
          return;
        }

        if (payload.source === "youtube" && isAllowedYouTubeEmbedUrl(payload.embedUrl)) {
          setEmbedUrl(payload.embedUrl);
          setUploadUrl(null);
          setReady(true);
          setDenied(false);
          return;
        }

        setDenied(true);
        setReady(false);
      })
      .catch(() => {
        if (!cancelled) setDenied(true);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, lessonId]);

  if (!enabled) {
    return (
      <div className="aspect-video rounded-2xl border border-border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground px-4 text-center">
        {dict.agriacademy.enrollToWatch}
      </div>
    );
  }

  if (denied) {
    return (
      <div className="aspect-video rounded-2xl border border-border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground px-4 text-center">
        {dict.agriacademy.accessDenied}
      </div>
    );
  }

  if (uploadUrl) {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full rounded-2xl border border-border bg-black"
        src={uploadUrl}
      >
        <source src={uploadUrl} type={uploadMime} />
      </video>
    );
  }

  return (
    <YouTubePlayer
      embedUrl={embedUrl}
      title={title}
      ready={ready}
      pendingLabel={dict.agriacademy.enrollToWatch}
    />
  );
}
