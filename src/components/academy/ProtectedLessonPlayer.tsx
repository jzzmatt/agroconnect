"use client";

import React, { useEffect, useState } from "react";
import { BunnyPlayer } from "@/components/academy/BunnyPlayer";
import { useI18n } from "@/i18n/provider";

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
  const [deniedReason, setDeniedReason] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setEmbedUrl(null);
      setReady(false);
      setDenied(false);
      setDeniedReason(null);
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
        if (!res.ok || !payload?.allowed) {
          setDenied(true);
          setDeniedReason(payload?.code || "ACCESS_DENIED");
          setReady(false);
          setEmbedUrl(null);
          return;
        }
        setEmbedUrl(payload.embedUrl);
        setReady(true);
        setDenied(false);
        setDeniedReason(null);
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
    const message =
      deniedReason === "video_not_ready"
        ? dict.agriacademy.processing
        : dict.agriacademy.accessDenied;
    return (
      <div className="aspect-video rounded-2xl border border-border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground px-4 text-center">
        {message}
      </div>
    );
  }

  return <BunnyPlayer playbackUrl={embedUrl} title={title} ready={ready} />;
}
