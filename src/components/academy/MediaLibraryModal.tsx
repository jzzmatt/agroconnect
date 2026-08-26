"use client";

import React, { useEffect, useState } from "react";
import { Film, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AcademyVideoUploader } from "@/components/academy/AcademyVideoUploader";
import { listMediaLibraryAction } from "@/lib/services/course-actions";
import type { AcademyVideoDescriptor } from "@/types/agriacademy";

export function MediaLibraryModal({
  open,
  remainingBytes,
  onClose,
  onSelect,
}: {
  open: boolean;
  remainingBytes: number;
  onClose: () => void;
  onSelect: (videoId: string) => void;
}) {
  const [videos, setVideos] = useState<AcademyVideoDescriptor[]>([]);
  const [tab, setTab] = useState<"library" | "upload">("library");

  useEffect(() => {
    if (!open) return;
    void listMediaLibraryAction().then(setVideos).catch(() => setVideos([]));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-elevated border border-border rounded-3xl p-5 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black">Biblioteca de vídeos</h3>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === "library" ? "primary" : "outline"}
            onClick={() => setTab("library")}
          >
            Vídeos existentes
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "upload" ? "primary" : "outline"}
            onClick={() => setTab("upload")}
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            Novo vídeo
          </Button>
        </div>

        {tab === "library" ? (
          <div className="space-y-2">
            {videos.length === 0 ? (
              <p className="text-xs text-muted-foreground">Ainda não tem vídeos na biblioteca.</p>
            ) : (
              videos.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => {
                    onSelect(video.id);
                    onClose();
                  }}
                  className="w-full text-left rounded-2xl border border-border p-3 hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold truncate">{video.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {video.status} · refs: {video.reference_count ?? 0}
                  </p>
                </button>
              ))
            )}
          </div>
        ) : (
          <AcademyVideoUploader
            remainingBytes={remainingBytes}
            onUploaded={() => {
              void listMediaLibraryAction().then(setVideos);
              setTab("library");
            }}
          />
        )}
      </div>
    </div>
  );
}
