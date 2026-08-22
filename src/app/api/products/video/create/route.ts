import { NextResponse } from "next/server";
import { createProductVideoUploadAction } from "@/lib/services/product-video-actions";
import { normalizeVideoUploadMeta } from "@/lib/products/ids";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const meta = normalizeVideoUploadMeta({
      mimeType: body?.mimeType,
      fileName: body?.filename || body?.fileName,
    });
    const result = await createProductVideoUploadAction({
      productId: String(body?.productId || ""),
      title: String(body?.title || "product-video"),
      filename: meta.fileName,
      mimeType: meta.mimeType,
      fileSize: Number(body?.fileSize || 0),
      durationSeconds: Number(body?.durationSeconds || 0),
    });
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { success: false, error: message || "BUNNY_UPLOAD_FAILED" },
      { status: /autorizado|unauthor/i.test(message) ? 401 : 500 }
    );
  }
}
