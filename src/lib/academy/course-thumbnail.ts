export const ACADEMY_COURSE_THUMBNAILS_BUCKET = "academy-course-thumbnails";
export const ACADEMY_COURSE_THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024;

export const ACADEMY_COURSE_THUMBNAIL_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export const ACADEMY_COURSE_THUMBNAIL_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function extensionFromFilename(fileName: string): string | null {
  const match = fileName.trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? null;
}

export function mimeTypeFromThumbnailExtension(ext: string): string | null {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return null;
  }
}

export function validateCourseThumbnailFileMeta(params: {
  fileName: string;
  fileSize: number;
  mimeType?: string | null;
}): { ok: true; extension: string; mimeType: string } | { ok: false; code: "THUMBNAIL_FILE_TOO_LARGE" | "THUMBNAIL_FORMAT_UNSUPPORTED" } {
  if (!Number.isFinite(params.fileSize) || params.fileSize <= 0) {
    return { ok: false, code: "THUMBNAIL_FORMAT_UNSUPPORTED" };
  }
  if (params.fileSize > ACADEMY_COURSE_THUMBNAIL_MAX_BYTES) {
    return { ok: false, code: "THUMBNAIL_FILE_TOO_LARGE" };
  }

  const extension = extensionFromFilename(params.fileName);
  if (
    !extension ||
    !ACADEMY_COURSE_THUMBNAIL_EXTENSIONS.includes(
      extension as (typeof ACADEMY_COURSE_THUMBNAIL_EXTENSIONS)[number]
    )
  ) {
    return { ok: false, code: "THUMBNAIL_FORMAT_UNSUPPORTED" };
  }

  const mimeFromExt = mimeTypeFromThumbnailExtension(extension);
  const mime = (params.mimeType || "").trim().toLowerCase();
  if (
    mime &&
    !ACADEMY_COURSE_THUMBNAIL_MIME_TYPES.includes(mime as (typeof ACADEMY_COURSE_THUMBNAIL_MIME_TYPES)[number])
  ) {
    return { ok: false, code: "THUMBNAIL_FORMAT_UNSUPPORTED" };
  }

  return { ok: true, extension, mimeType: mime || mimeFromExt || "image/jpeg" };
}

export function buildCourseThumbnailStoragePath(params: {
  ownerId: string;
  courseId: string;
  extension: string;
}): string {
  const safeExt = params.extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `${params.ownerId}/${params.courseId}/thumbnail.${safeExt}`;
}

export function courseHasStoredThumbnail(course: {
  thumbnail_storage_path?: string | null;
  thumbnail_url?: string | null;
}): boolean {
  return Boolean(course.thumbnail_storage_path?.trim()) || Boolean(course.thumbnail_url?.trim());
}
