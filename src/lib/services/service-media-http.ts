import { NextResponse } from "next/server";

export function serviceMediaError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error && typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : "TEMP_VIDEO_FAILED";
  const status = code === "AUTH_REQUIRED"
    ? 401
    : code === "NOT_FOUND"
      ? 404
      : code === "PRODUCT_VIDEO_TOO_LARGE"
        ? 413
        : code === "CHUNK_MISSING"
          ? 409
          : code === "INVALID_REQUEST" || code === "PRODUCT_IMAGE_INVALID" || code === "PRODUCT_VIDEO_INVALID" || code === "PRODUCT_VIDEO_TOO_LONG"
            ? 400
            : code === "STORAGE_UNAVAILABLE"
              ? 503
              : 500;
  console.error("[service media] request failed", code);
  return NextResponse.json({ success: false, code }, { status });
}
