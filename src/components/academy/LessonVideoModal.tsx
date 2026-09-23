"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { YouTubePlayer } from "@/components/academy/YouTubePlayer";
import { CourseConfirmDialog } from "@/components/academy/CourseConfirmDialog";
import {
  analyzeYouTubeInput,
  buildYouTubeEmbedUrl,
  buildYouTubeThumbnailUrl,
} from "@/lib/academy/youtube";
import { uploadLessonVideoWithProgress } from "@/lib/academy/upload-lesson-video-client";
import { ACADEMY_LESSON_VIDEO_MAX_BYTES, validateLessonVideoFileMeta } from "@/lib/academy/lesson-video";
import { useI18n } from "@/i18n/provider";
import type { CourseLessonRecord } from "@/types/agriacademy";

type VideoSource = "youtube" | "upload";
type UploadPhase = "idle" | "validating" | "uploading" | "saving" | "ready" | "failed";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LessonVideoModal({
  open,
  lesson,
  onClose,
  onYouTubeSave,
  onUploadComplete,
}: {
  open: boolean;
  lesson: CourseLessonRecord | null;
  onClose: () => void;
  onYouTubeSave: (urlOrId: string) => void;
  onUploadComplete: (lesson: CourseLessonRecord) => void;
}) {
  const { dict } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<VideoSource>("youtube");
  const [pendingSource, setPendingSource] = useState<VideoSource | null>(null);
  const [youtubeValue, setYoutubeValue] = useState("");
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState({ loaded: 0, total: 0 });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const analysis = analyzeYouTubeInput(youtubeValue);
  const videoId = analysis.ok ? analysis.videoId : null;
  const embedUrl = buildYouTubeEmbedUrl(videoId);
  const thumbnailUrl = buildYouTubeThumbnailUrl(videoId);

  useEffect(() => {
    if (!open || !lesson) return;
    const initialSource: VideoSource =
      lesson.video_source === "upload" && lesson.upload_storage_path ? "upload" : "youtube";
    setSource(initialSource);
    setYoutubeValue(lesson.youtube_source_url || lesson.youtube_video_id || "");
    setUploadPhase("idle");
    setUploadProgress({ loaded: 0, total: 0 });
    setUploadError(null);
    setThumbnailFailed(false);
    setPreviewUrl(null);
  }, [open, lesson]);

  useEffect(() => {
    if (!open || !lesson || source !== "upload" || lesson.upload_status !== "ready") {
      setPreviewUrl(null);
      return;
    }

    let cancelled = false;
    void fetch(`/api/academy/lessons/${lesson.id}/video/preview`, { credentials: "same-origin" })
      .then(async (res) => {
        const payload = await res.json().catch(() => null);
        if (cancelled || !res.ok || !payload?.playbackUrl) return;
        setPreviewUrl(payload.playbackUrl);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [open, lesson, source]);

  const requestSourceChange = (next: VideoSource) => {
    if (next === source) return;
    setPendingSource(next);
  };

  const confirmSourceChange = () => {
    if (!pendingSource) return;
    setSource(pendingSource);
    setPendingSource(null);
    setUploadError(null);
    setUploadPhase("idle");
  };

  const uploadFile = useCallback(
    async (file: File) => {
      if (!lesson) return;
      setUploadError(null);
      setUploadPhase("validating");

      const validation = validateLessonVideoFileMeta({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
      if (!validation.ok) {
        setUploadPhase("failed");
        setUploadError(
          validation.code === "VIDEO_FILE_TOO_LARGE"
            ? dict.agriacademy.courseEditorVideoFileTooLarge
            : dict.agriacademy.courseEditorVideoFormatUnsupported
        );
        return;
      }

      setUploadPhase("uploading");
      setUploadProgress({ loaded: 0, total: file.size });

      try {
        const prepareRes = await fetch(`/api/academy/lessons/${lesson.id}/video/upload/prepare`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          }),
        });
        const preparePayload = await prepareRes.json().catch(() => null);
        if (!prepareRes.ok || !preparePayload?.signedUrl || !preparePayload?.storagePath) {
          throw new Error(preparePayload?.error || "PREPARE_FAILED");
        }

        await uploadLessonVideoWithProgress({
          signedUrl: preparePayload.signedUrl,
          file,
          mimeType: preparePayload.mimeType || file.type || "video/mp4",
          onProgress: (loaded, total) => setUploadProgress({ loaded, total }),
        });

        setUploadPhase("saving");
        const completeRes = await fetch(`/api/academy/lessons/${lesson.id}/video/upload/complete`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storagePath: preparePayload.storagePath,
            fileName: file.name,
            fileSize: file.size,
            mimeType: preparePayload.mimeType || file.type,
            replace: Boolean(lesson.upload_storage_path),
          }),
        });
        const completePayload = await completeRes.json().catch(() => null);
        if (!completeRes.ok || !completePayload?.lesson) {
          throw new Error(completePayload?.error || dict.agriacademy.courseEditorVideoDbFailed);
        }

        setUploadPhase("ready");
        onUploadComplete(completePayload.lesson as CourseLessonRecord);
      } catch (error) {
        setUploadPhase("failed");
        setUploadError(
          error instanceof Error && error.message === "PREPARE_FAILED"
            ? dict.agriacademy.courseEditorVideoUploadFailed
            : error instanceof Error && error.message.includes("guardar")
              ? dict.agriacademy.courseEditorVideoDbFailed
              : dict.agriacademy.courseEditorVideoUploadFailed
        );
      }
    },
    [dict.agriacademy, lesson, onUploadComplete]
  );

  const progressPercent = useMemo(() => {
    if (!uploadProgress.total) return 0;
    return Math.min(100, Math.round((uploadProgress.loaded / uploadProgress.total) * 100));
  }, [uploadProgress]);

  if (!open || !lesson) return null;

  const invalidReason = (() => {
    if (!youtubeValue.trim() || analysis.ok) return null;
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

  const sourceChangeMessage =
    pendingSource === "upload"
      ? dict.agriacademy.courseEditorVideoChangeSourceToUpload
      : dict.agriacademy.courseEditorVideoChangeSourceToYoutube;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-4 space-y-4">
          <h2 className="text-sm font-black">{dict.agriacademy.courseEditorVideoTitle}</h2>

          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-muted-foreground">
              {dict.agriacademy.courseEditorVideoSourceLabel}
            </legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="video-source"
                checked={source === "youtube"}
                onChange={() => requestSourceChange("youtube")}
              />
              {dict.agriacademy.courseEditorVideoYoutube}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="video-source"
                checked={source === "upload"}
                onChange={() => requestSourceChange("upload")}
              />
              {dict.agriacademy.courseEditorVideoUpload}
            </label>
          </fieldset>

          {source === "youtube" ? (
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground">{dict.agriacademy.youtubeUnlistedHint}</p>
              <input
                value={youtubeValue}
                onChange={(event) => setYoutubeValue(event.target.value)}
                placeholder={dict.agriacademy.youtubeUrlPlaceholder}
                className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:outline-none"
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
                      className="h-16 w-28 rounded-lg border border-border object-cover"
                      onError={() => setThumbnailFailed(true)}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {dict.agriacademy.youtubeVideoIdLabel}
                    </p>
                    <p className="truncate text-sm font-bold">{videoId}</p>
                  </div>
                </div>
              ) : null}
              <YouTubePlayer
                embedUrl={embedUrl}
                title={dict.agriacademy.preview}
                ready={Boolean(embedUrl)}
                pendingLabel={dict.agriacademy.youtubePreviewPending}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground">
                {dict.agriacademy.courseEditorVideoSupportedFormats}
              </p>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {dict.agriacademy.courseEditorVideoMaxSize}
              </p>

              <div
                className="rounded-xl border border-dashed border-border bg-surface/60 p-6 text-center"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (file) void uploadFile(file);
                }}
              >
                <p className="text-sm font-semibold">{dict.agriacademy.courseEditorVideoDragDrop}</p>
                <p className="mt-1 text-xs text-muted-foreground">{dict.agriacademy.courseEditorVideoOr}</p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3"
                  disabled={uploadPhase === "uploading" || uploadPhase === "saving"}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {dict.agriacademy.courseEditorVideoChooseFile}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadFile(file);
                    event.target.value = "";
                  }}
                />
              </div>

              {uploadPhase === "uploading" || uploadPhase === "saving" ? (
                <div className="space-y-2" role="status" aria-live="polite">
                  <p className="text-xs font-semibold">
                    {uploadPhase === "saving"
                      ? dict.agriacademy.courseEditorVideoSaving
                      : dict.agriacademy.courseEditorVideoUploading}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(uploadProgress.loaded)} / {formatBytes(uploadProgress.total)} ({progressPercent}%)
                  </p>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPercent}
                    role="progressbar"
                  >
                    <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              ) : null}

              {uploadPhase === "ready" ? (
                <p className="text-xs font-semibold text-primary">{dict.agriacademy.courseEditorVideoReadySuccess}</p>
              ) : null}

              {uploadError ? <p className="text-xs font-semibold text-destructive">{uploadError}</p> : null}

              {previewUrl ? (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full rounded-xl border border-border bg-black"
                  src={previewUrl}
                />
              ) : null}

              {lesson.upload_original_filename ? (
                <p className="text-[11px] text-muted-foreground">
                  {lesson.upload_original_filename}
                  {lesson.upload_original_size ? ` · ${formatBytes(lesson.upload_original_size)}` : ""}
                </p>
              ) : null}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onClose}>
              {dict.agriacademy.closePreview}
            </Button>
            {source === "youtube" ? (
              <Button
                type="button"
                size="sm"
                disabled={!analysis.ok}
                onClick={() => {
                  if (!analysis.ok) return;
                  onYouTubeSave(analysis.normalizedUrl);
                }}
              >
                {dict.agriacademy.saveYouTubeUrl}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <CourseConfirmDialog
        open={Boolean(pendingSource)}
        title={dict.agriacademy.courseEditorVideoChangeSourceTitle}
        message={sourceChangeMessage}
        confirmLabel={dict.agriacademy.courseEditorVideoChangeSourceConfirm}
        cancelLabel={dict.agriacademy.closePreview}
        onCancel={() => setPendingSource(null)}
        onConfirm={confirmSourceChange}
      />
    </>
  );
}
