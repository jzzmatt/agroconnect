import {
  PRODUCT_VIDEO_MAX_BYTES,
  PRODUCT_VIDEO_MAX_SECONDS,
  PRODUCT_VIDEO_SOURCE_MAX_BYTES,
} from "@/config/product-catalog";
import { PRODUCT_ERROR_CODES } from "@/lib/products/errors";

const FINAL_MIME = ["video/mp4", "video/webm"];
const SOURCE_MIME = ["video/mp4", "video/webm", "video/quicktime"];

export function isFinalProductVideoMime(mime?: string | null): boolean {
  return !!mime && FINAL_MIME.includes(mime);
}

export function isSourceProductVideoMime(mime?: string | null): boolean {
  if (!mime) return false;
  return SOURCE_MIME.includes(mime) || mime.startsWith("video/");
}

export function validateProductVideo(params: {
  mimeType?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
  fileName?: string | null;
}): { ok: true } | { ok: false; code: string; error: string } {
  if (!isFinalProductVideoMime(params.mimeType)) {
    return { ok: false, code: PRODUCT_ERROR_CODES.PRODUCT_VIDEO_INVALID, error: "Use MP4 or WebM." };
  }
  if (!params.fileSize || params.fileSize <= 0 || params.fileSize > PRODUCT_VIDEO_MAX_BYTES) {
    return {
      ok: false,
      code: PRODUCT_ERROR_CODES.PRODUCT_VIDEO_TOO_LARGE,
      error: `Maximum product video size is ${Math.round(PRODUCT_VIDEO_MAX_BYTES / (1024 * 1024))} MB.`,
    };
  }
  if (params.durationSeconds == null || Number.isNaN(params.durationSeconds) || params.durationSeconds <= 0) {
    return { ok: false, code: PRODUCT_ERROR_CODES.PRODUCT_VIDEO_INVALID, error: "Could not read video duration." };
  }
  if (params.durationSeconds > PRODUCT_VIDEO_MAX_SECONDS + 0.05) {
    return {
      ok: false,
      code: PRODUCT_ERROR_CODES.PRODUCT_VIDEO_TOO_LONG,
      error: `The video cannot be longer than ${PRODUCT_VIDEO_MAX_SECONDS} seconds.`,
    };
  }
  const ext = (params.fileName || "").toLowerCase();
  if (ext && !/\.(mp4|webm)$/.test(ext)) {
    return { ok: false, code: PRODUCT_ERROR_CODES.PRODUCT_VIDEO_INVALID, error: "Use an .mp4 or .webm file." };
  }
  return { ok: true };
}

export function validateProductVideoSource(params: {
  mimeType?: string | null;
  fileSize?: number | null;
  fileName?: string | null;
}): { ok: true } | { ok: false; code: string; error: string } {
  if (!isSourceProductVideoMime(params.mimeType)) {
    return { ok: false, code: PRODUCT_ERROR_CODES.PRODUCT_VIDEO_INVALID, error: "Use MP4 or WebM." };
  }
  if (!params.fileSize || params.fileSize <= 0 || params.fileSize > PRODUCT_VIDEO_SOURCE_MAX_BYTES) {
    return {
      ok: false,
      code: PRODUCT_ERROR_CODES.PRODUCT_VIDEO_TOO_LARGE,
      error: `Maximum original video size is ${Math.round(PRODUCT_VIDEO_SOURCE_MAX_BYTES / (1024 * 1024))} MB.`,
    };
  }
  const ext = (params.fileName || "").toLowerCase();
  if (ext && !/\.(mp4|webm|mov)$/.test(ext)) {
    return { ok: false, code: PRODUCT_ERROR_CODES.PRODUCT_VIDEO_INVALID, error: "Use an .mp4, .webm or .mov file." };
  }
  return { ok: true };
}

export function clampTrimWindow(
  startSeconds: number,
  endSeconds: number,
  durationSeconds: number,
  maxSeconds = PRODUCT_VIDEO_MAX_SECONDS
): { start: number; end: number } {
  const duration = Math.max(0, durationSeconds || 0);
  const maxWindow = Math.min(maxSeconds, duration);
  let start = Number.isFinite(startSeconds) ? startSeconds : 0;
  let end = Number.isFinite(endSeconds) ? endSeconds : start + maxWindow;
  start = Math.max(0, Math.min(start, Math.max(0, duration - 0.1)));
  end = Math.max(start + 0.1, Math.min(end, duration));
  if (end - start > maxWindow) {
    end = start + maxWindow;
    if (end > duration) {
      end = duration;
      start = Math.max(0, end - maxWindow);
    }
  }
  return { start, end };
}

export function needsProductVideoTrim(durationSeconds: number): boolean {
  return durationSeconds > PRODUCT_VIDEO_MAX_SECONDS + 0.05;
}
