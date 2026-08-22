"use client";

import React from "react";

export function BunnyPlayer({
  playbackUrl,
  title,
  ready,
}: {
  playbackUrl?: string | null;
  title: string;
  ready: boolean;
}) {
  if (!ready || !playbackUrl) {
    return (
      <div className="aspect-video rounded-2xl border border-border bg-surface flex items-center justify-center text-xs text-muted-foreground">
        O vídeo ainda não está pronto para reprodução.
      </div>
    );
  }

  return (
    <iframe
      title={title}
      src={playbackUrl}
      className="w-full aspect-video rounded-2xl border border-border"
      allow="accelerometer; gyroscope; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}
