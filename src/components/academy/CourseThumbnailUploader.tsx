"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CourseConfirmDialog } from "@/components/academy/CourseConfirmDialog";
import { uploadBlobWithProgress } from "@/lib/academy/upload-storage-client";
import {
  courseHasStoredThumbnail,
  validateCourseThumbnailFileMeta,
} from "@/lib/academy/course-thumbnail";
import { useI18n } from "@/i18n/provider";
import type { CourseRecord } from "@/types/agriacademy";

type Phase = "idle" | "selecting" | "validating" | "uploading" | "saving" | "ready" | "failed";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CourseThumbnailUploader({
  courseId,
  courseTitle,
  course,
  disabled,
  onCourseUpdated,
}: {
  courseId: string;
  courseTitle: string;
  course: Pick<
    CourseRecord,
    | "thumbnail_storage_path"
    | "thumbnail_url"
    | "thumbnail_original_filename"
    | "thumbnail_size"
  >;
  disabled?: boolean;
  onCourseUpdated: (course: CourseRecord) => void;
}) {
  const { dict } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [displayLoading, setDisplayLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);

  const hasThumbnail = courseHasStoredThumbnail(course);
  const altText = dict.agriacademy.courseEditorThumbnailAlt.replace("{title}", courseTitle);

  useEffect(() => {
    if (hasThumbnail && !pendingFile) setPhase("ready");
  }, [hasThumbnail, pendingFile]);

  useEffect(() => {
    if (!hasThumbnail || pendingFile) return;
    let cancelled = false;
    setDisplayLoading(true);
    void fetch(`/api/academy/courses/${courseId}/thumbnail/display`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && payload?.displayUrl) {
          setDisplayUrl(payload.displayUrl);
        } else if (course.thumbnail_url) {
          setDisplayUrl(course.thumbnail_url);
        } else {
          setDisplayUrl(null);
        }
      })
      .catch(() => {
        if (!cancelled && course.thumbnail_url) setDisplayUrl(course.thumbnail_url);
      })
      .finally(() => {
        if (!cancelled) setDisplayLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, course.thumbnail_url, hasThumbnail, pendingFile]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  const progressPercent = useMemo(() => {
    if (!progress.total) return 0;
    return Math.min(100, Math.round((progress.loaded / progress.total) * 100));
  }, [progress]);

  const resetSelection = () => {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(null);
    setPendingFile(null);
    setPhase(hasThumbnail ? "ready" : "idle");
    setError(null);
    setProgress({ loaded: 0, total: 0 });
  };

  const onFileChosen = (file: File) => {
    setError(null);
    setPhase("validating");
    const validation = validateCourseThumbnailFileMeta({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
    if (!validation.ok) {
      setPhase("failed");
      setError(
        validation.code === "THUMBNAIL_FILE_TOO_LARGE"
          ? dict.agriacademy.courseEditorThumbnailFileTooLarge
          : dict.agriacademy.courseEditorThumbnailFormatUnsupported
      );
      return;
    }
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(URL.createObjectURL(file));
    setPendingFile(file);
    setPhase("selecting");
  };

  const uploadPending = useCallback(async () => {
    if (!pendingFile) return;
    setError(null);
    setPhase("uploading");
    setProgress({ loaded: 0, total: pendingFile.size });

    try {
      const prepareRes = await fetch(`/api/academy/courses/${courseId}/thumbnail/upload/prepare`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: pendingFile.name,
          fileSize: pendingFile.size,
          mimeType: pendingFile.type,
        }),
      });
      const preparePayload = await prepareRes.json().catch(() => null);
      if (!prepareRes.ok || !preparePayload?.signedUrl || !preparePayload?.storagePath) {
        throw new Error("PREPARE_FAILED");
      }

      await uploadBlobWithProgress({
        signedUrl: preparePayload.signedUrl,
        file: pendingFile,
        mimeType: preparePayload.mimeType || pendingFile.type || "image/jpeg",
        onProgress: (loaded, total) => setProgress({ loaded, total }),
      });

      setPhase("saving");
      const completeRes = await fetch(`/api/academy/courses/${courseId}/thumbnail/upload/complete`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: preparePayload.storagePath,
          fileName: pendingFile.name,
          fileSize: pendingFile.size,
          mimeType: preparePayload.mimeType || pendingFile.type,
          replace: hasThumbnail,
        }),
      });
      const completePayload = await completeRes.json().catch(() => null);
      if (!completeRes.ok || !completePayload?.course) {
        throw new Error("SAVE_FAILED");
      }

      onCourseUpdated(completePayload.course as CourseRecord);
      setPendingFile(null);
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
      setDisplayUrl(null);
      setPhase("ready");
    } catch {
      setPhase("failed");
      setError(dict.agriacademy.courseEditorThumbnailUploadFailed);
    }
  }, [
    courseId,
    dict.agriacademy,
    hasThumbnail,
    localPreviewUrl,
    onCourseUpdated,
    pendingFile,
  ]);

  const removeThumbnail = async () => {
    setRemoveBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/academy/courses/${courseId}/thumbnail/remove`, {
        method: "POST",
        credentials: "same-origin",
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.course) {
        throw new Error("REMOVE_FAILED");
      }
      onCourseUpdated(payload.course as CourseRecord);
      setDisplayUrl(null);
      setPhase("idle");
      setRemoveOpen(false);
    } catch {
      setError(dict.agriacademy.courseEditorThumbnailSaveFailed);
    } finally {
      setRemoveBusy(false);
    }
  };

  const previewSrc = localPreviewUrl || displayUrl;
  const busy = phase === "uploading" || phase === "saving" || disabled;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface/40 p-4">
      <div>
        <h3 className="text-sm font-black">{dict.agriacademy.courseEditorThumbnailTitle}</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          {dict.agriacademy.courseEditorThumbnailHint}
        </p>
      </div>

      <div className="aspect-video max-w-md overflow-hidden rounded-xl border border-border bg-linear-to-br from-emerald-800 to-emerald-950 flex items-center justify-center">
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewSrc} alt={altText} className="h-full w-full object-cover" />
        ) : displayLoading ? (
          <p className="text-xs text-emerald-100">{dict.common.loading}</p>
        ) : (
          <GraduationCap className="w-10 h-10 text-emerald-200" aria-hidden />
        )}
      </div>

      {hasThumbnail && phase === "ready" && !pendingFile ? (
        <p className="text-xs font-semibold text-primary">{dict.agriacademy.courseEditorThumbnailSaved}</p>
      ) : null}

      {pendingFile ? (
        <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
          <p className="text-xs font-semibold">{dict.agriacademy.courseEditorThumbnailSelected}</p>
          <p className="text-[11px] text-muted-foreground">
            {pendingFile.name} · {formatBytes(pendingFile.size)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void uploadPending()}>
              {dict.agriacademy.courseEditorThumbnailUploadAction}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={resetSelection}>
              {dict.common.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl border border-dashed border-border bg-surface/60 p-5 text-center max-w-md"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file) onFileChosen(file);
          }}
        >
          <p className="text-sm font-semibold">{dict.agriacademy.courseEditorThumbnailDragDrop}</p>
          <p className="mt-1 text-xs text-muted-foreground">{dict.agriacademy.courseEditorThumbnailOr}</p>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {hasThumbnail
              ? dict.agriacademy.courseEditorThumbnailReplace
              : dict.agriacademy.courseEditorThumbnailChooseImage}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="sr-only"
            aria-label={dict.agriacademy.courseEditorThumbnailChooseImage}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFileChosen(file);
              event.target.value = "";
            }}
          />
          <p className="mt-3 text-[11px] text-muted-foreground">
            {dict.agriacademy.courseEditorThumbnailSupportedFormats}
          </p>
          <p className="text-[11px] font-semibold text-muted-foreground">
            {dict.agriacademy.courseEditorThumbnailMaxSize}
          </p>
        </div>
      )}

      {phase === "uploading" || phase === "saving" ? (
        <div className="space-y-2 max-w-md" role="status" aria-live="polite">
          <p className="text-xs font-semibold">
            {phase === "saving"
              ? dict.agriacademy.courseEditorThumbnailSaving
              : dict.agriacademy.courseEditorThumbnailUploading}
          </p>
          {pendingFile ? (
            <p className="text-[11px] text-muted-foreground">
              {pendingFile.name} · {formatBytes(progress.loaded)} / {formatBytes(progress.total)} (
              {progressPercent}%)
            </p>
          ) : null}
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

      {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}

      {hasThumbnail && !pendingFile ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => setRemoveOpen(true)}
        >
          {dict.agriacademy.courseEditorThumbnailRemove}
        </Button>
      ) : null}

      <CourseConfirmDialog
        open={removeOpen}
        title={dict.agriacademy.courseEditorThumbnailRemoveTitle}
        message={dict.agriacademy.courseEditorThumbnailRemoveMessage}
        confirmLabel={dict.agriacademy.courseEditorThumbnailRemove}
        cancelLabel={dict.common.cancel}
        confirmVariant="destructive"
        loading={removeBusy}
        onCancel={() => setRemoveOpen(false)}
        onConfirm={() => void removeThumbnail()}
      />
    </section>
  );
}
