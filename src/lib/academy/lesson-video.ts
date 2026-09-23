import { isYouTubeVideoId } from "@/lib/academy/youtube";
import type { CourseLessonRecord } from "@/types/agriacademy";

export const ACADEMY_VIDEOS_BUCKET = "academy-videos";
export const ACADEMY_LESSON_VIDEO_MAX_BYTES = 500 * 1024 * 1024;

export const ACADEMY_LESSON_VIDEO_EXTENSIONS = ["mp4", "webm", "mov"] as const;

export const ACADEMY_LESSON_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type LessonVideoSource = "youtube" | "upload";

export type LessonUploadStatus = "uploading" | "ready" | "failed";

export function extensionFromFilename(fileName: string): string | null {
  const match = fileName.trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? null;
}

export function mimeTypeFromExtension(ext: string): string | null {
  switch (ext) {
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    default:
      return null;
  }
}

export function validateLessonVideoFileMeta(params: {
  fileName: string;
  fileSize: number;
  mimeType?: string | null;
}): { ok: true; extension: string; mimeType: string } | { ok: false; code: "VIDEO_FILE_TOO_LARGE" | "VIDEO_FORMAT_UNSUPPORTED" } {
  if (!Number.isFinite(params.fileSize) || params.fileSize <= 0) {
    return { ok: false, code: "VIDEO_FORMAT_UNSUPPORTED" };
  }
  if (params.fileSize > ACADEMY_LESSON_VIDEO_MAX_BYTES) {
    return { ok: false, code: "VIDEO_FILE_TOO_LARGE" };
  }

  const extension = extensionFromFilename(params.fileName);
  if (!extension || !ACADEMY_LESSON_VIDEO_EXTENSIONS.includes(extension as (typeof ACADEMY_LESSON_VIDEO_EXTENSIONS)[number])) {
    return { ok: false, code: "VIDEO_FORMAT_UNSUPPORTED" };
  }

  const mimeFromExt = mimeTypeFromExtension(extension);
  const mime = (params.mimeType || "").trim().toLowerCase();
  if (mime && !ACADEMY_LESSON_VIDEO_MIME_TYPES.includes(mime as (typeof ACADEMY_LESSON_VIDEO_MIME_TYPES)[number])) {
    return { ok: false, code: "VIDEO_FORMAT_UNSUPPORTED" };
  }

  return { ok: true, extension, mimeType: mime || mimeFromExt || "video/mp4" };
}

export function lessonHasPlayableVideo(lesson: {
  video_source?: CourseLessonRecord["video_source"] | null;
  youtube_video_id?: string | null;
  upload_storage_path?: string | null;
  upload_status?: CourseLessonRecord["upload_status"] | null;
}): boolean {
  const source = lesson.video_source ?? "youtube";
  if (source === "upload") {
    return Boolean(lesson.upload_storage_path) && lesson.upload_status === "ready";
  }
  return isYouTubeVideoId(lesson.youtube_video_id);
}

export function buildLessonUploadStoragePath(params: {
  ownerId: string;
  courseId: string;
  lessonId: string;
  assetId: string;
  extension: string;
}): string {
  return `${params.ownerId}/${params.courseId}/${params.lessonId}/${params.assetId}/original.${params.extension}`;
}
