"use client";

import React from "react";
import { isAllowedYouTubeEmbedUrl } from "@/lib/academy/youtube";

export function YouTubePlayer({
  embedUrl,
  title,
  ready,
  pendingLabel,
}: {
  embedUrl?: string | null;
  title: string;
  ready: boolean;
  pendingLabel: string;
}) {
  const allowedUrl = isAllowedYouTubeEmbedUrl(embedUrl) ? embedUrl : null;
  if (!ready || !allowedUrl) {
    return (
      <div className="aspect-video rounded-2xl border border-border bg-surface flex items-center justify-center text-xs text-muted-foreground px-4 text-center">
        {pendingLabel}
      </div>
    );
  }

  return (
    <iframe
      title={title}
      src={allowedUrl}
      className="w-full aspect-video rounded-2xl border border-border"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
