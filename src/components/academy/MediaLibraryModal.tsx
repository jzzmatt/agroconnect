"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Film, Search, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AcademyVideoUploader } from "@/components/academy/AcademyVideoUploader";
import { BunnyPlayer } from "@/components/academy/BunnyPlayer";
import { formatVideoDuration } from "@/lib/academy/format-duration";
import { listMediaLibraryAction } from "@/lib/services/course-actions";
import { getAcademyVideoPreviewAction } from "@/lib/services/academy-video-actions";
import { isSelectableLibraryVideo } from "@/lib/academy/video-library-sync";
import { useI18n } from "@/i18n/provider";
import type { AcademyVideoDescriptor } from "@/types/agriacademy";

function MediaLibraryVideoPreview({ videoId, title }: { videoId: string; title: string }) {
  const { dict } = useI18n();
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDenied(false);
    setEmbedUrl(null);
    setReady(false);

    void getAcademyVideoPreviewAction(videoId)
      .then((result) => {
        if (cancelled) return;
        if (!result.allowed) {
          setDenied(true);
          setLoading(false);
          return;
        }
        setEmbedUrl(result.embedUrl ?? null);
        setReady(result.ready);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setDenied(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  if (loading) {
    return (
      <div className="aspect-video rounded-2xl border border-border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
        {dict.common.loading}
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

  return <BunnyPlayer playbackUrl={embedUrl} title={title} ready={ready} />;
}

function statusLabel(status: string, dict: ReturnType<typeof useI18n>["dict"]): string {
  if (status === "ready") return dict.agriacademy.ready;
  if (status === "processing" || status === "uploading") return dict.agriacademy.processing;
  if (status === "failed") return dict.agriacademy.videoUnavailable;
  return status;
}

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
  const { dict } = useI18n();
  const [videos, setVideos] = useState<AcademyVideoDescriptor[]>([]);
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void listMediaLibraryAction().then(setVideos).catch(() => setVideos([]));
    setQuery("");
    setPreviewId(null);
  }, [open]);

  const filteredVideos = useMemo(() => {
    const selectable = videos.filter(isSelectableLibraryVideo);
    const q = query.trim().toLowerCase();
    if (!q) return selectable;
    return selectable.filter((video) => video.title.toLowerCase().includes(q));
  }, [videos, query]);

  const previewVideo = previewId ? videos.find((video) => video.id === previewId) : null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-elevated border border-border rounded-3xl p-5 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black">{dict.agriacademy.mediaLibrary}</h3>
          <button type="button" onClick={onClose} aria-label={dict.common.close}>
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
            {dict.agriacademy.existingVideos}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "upload" ? "primary" : "outline"}
            onClick={() => setTab("upload")}
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            {dict.agriacademy.newVideo}
          </Button>
        </div>

        {tab === "library" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={dict.agriacademy.searchVideos}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {previewVideo && (
              <div className="space-y-2 rounded-2xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold truncate">{previewVideo.title}</p>
                  <button
                    type="button"
                    className="text-[11px] font-bold text-primary"
                    onClick={() => setPreviewId(null)}
                  >
                    {dict.agriacademy.closePreview}
                  </button>
                </div>
                <MediaLibraryVideoPreview videoId={previewVideo.id} title={previewVideo.title} />
              </div>
            )}

            {filteredVideos.length === 0 ? (
              <p className="text-xs text-muted-foreground">{dict.agriacademy.noVideosYet}</p>
            ) : (
              filteredVideos.map((video) => (
                <div
                  key={video.id}
                  className="rounded-2xl border border-border p-3 hover:border-primary transition-colors space-y-2"
                >
                  <div className="flex items-start gap-2">
                    {video.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={video.thumbnail_url}
                        alt=""
                        className="w-14 h-10 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Film className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{video.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {statusLabel(video.status, dict)} · {dict.agriacademy.duration}:{" "}
                        {formatVideoDuration(video.duration_seconds)} · {dict.agriacademy.references}:{" "}
                        {video.reference_count ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewId(video.id)}
                    >
                      {dict.agriacademy.preview}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        onSelect(video.id);
                        onClose();
                      }}
                    >
                      {dict.agriacademy.selectVideo}
                    </Button>
                  </div>
                </div>
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
