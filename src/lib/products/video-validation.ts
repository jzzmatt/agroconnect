import {
  PRODUCT_VIDEO_MAX_BYTES,
  PRODUCT_VIDEO_MAX_SECONDS,
  isValidProductVideoMime,
} from "@/config/product-catalog";
import { PRODUCT_ERROR_CODES } from "@/lib/products/errors";

export function validateProductVideo(params: {
  mimeType?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
  fileName?: string | null;
}): { ok: true } | { ok: false; code: string; error: string } {
  if (!isValidProductVideoMime(params.mimeType)) {
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
