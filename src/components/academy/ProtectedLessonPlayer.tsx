"use client";

import React, { useEffect, useState } from "react";
import { YouTubePlayer } from "@/components/academy/YouTubePlayer";
import { useI18n } from "@/i18n/provider";
import { isAllowedYouTubeEmbedUrl } from "@/lib/academy/youtube";

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
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setEmbedUrl(null);
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
        const payload = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !payload?.allowed || !isAllowedYouTubeEmbedUrl(payload.embedUrl)) {
          setDenied(true);
          setReady(false);
          setEmbedUrl(null);
          return;
        }
        setEmbedUrl(payload.embedUrl);
        setReady(true);
        setDenied(false);
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

  return (
    <YouTubePlayer
      embedUrl={embedUrl}
      title={title}
      ready={ready}
      pendingLabel={dict.agriacademy.enrollToWatch}
    />
  );
}
