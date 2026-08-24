import { NextResponse } from "next/server";
import { confirmProductVideoUploadAction } from "@/lib/services/product-video-actions";

export const runtime = "nodejs";

/**
 * The browser calls this once the direct ImageKit upload finishes. ImageKit
 * uploads are synchronous, so this is the terminal "ready" transition —
 * there is no async transcoding step or webhook to wait on, unlike Bunny.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await confirmProductVideoUploadAction({
      videoId: String(body?.videoId || ""),
      productId: String(body?.productId || ""),
      fileId: String(body?.fileId || ""),
      url: String(body?.url || ""),
      thumbnailUrl: body?.thumbnailUrl ? String(body.thumbnailUrl) : null,
      fileSize: typeof body?.fileSize === "number" ? body.fileSize : undefined,
    });
    return NextResponse.json(result, {
      status: result.success ? 200 : result.code === "AUTH_REQUIRED" ? 401 : 400,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        success: false,
        code: "IMAGEKIT_UPLOAD_FAILED",
        error: message || "IMAGEKIT_UPLOAD_FAILED",
      },
      { status: /autorizado|unauthor/i.test(message) ? 401 : 500 }
    );
  }
}
