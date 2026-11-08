import { NextResponse } from "next/server";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { isUuid } from "@/lib/products/ids";
import { AGROPRODUCT_TEMP_VIDEO_BUCKET } from "@/lib/media/supabase-buckets";
import { downloadStorageObject, removeStorageObject } from "@/lib/media/supabase-storage-core";
import { finishChunkedTempVideo, planTempVideoUpload } from "@/lib/products/temp-video-chunks";
import { findOwnedTempVideo, saveOwnedTempVideo } from "@/lib/products/temp-video-runtime";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(error: unknown) {
  const explicit = error && typeof error === "object" && "code" in error ? (error as { code: unknown }).code : null;
  const code = typeof explicit === "string" && /^[A-Z0-9_]+$/.test(explicit)
    ? explicit
    : error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : "TEMP_VIDEO_FAILED";
  const status = code === "PRODUCT_VIDEO_TOO_LARGE" || code === "PRODUCT_VIDEO_TOO_LONG" || code === "PRODUCT_VIDEO_INVALID" || code === "INVALID_REQUEST" || code === "THUMBNAIL_REQUIRED"
    ? 400
    : code === "CHUNK_MISSING" || code === "TEMP_VIDEO_BUSY"
      ? 409
      : 500;
  console.error("[product temp video] complete failed", error instanceof Error ? error.message : code);
  return NextResponse.json({ success: false, code }, { status });
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile || !isUuid(profile.id)) {
      return NextResponse.json({ success: false, code: "AUTH_REQUIRED" }, { status: 401 });
    }
    const entitlements = getUserEntitlements({
      subscriptionPlan: profile.subscription_plan,
      roles: profile.roles,
    });
    if (!entitlements.can_upload_product_video) {
      return NextResponse.json({ success: false, code: "PRODUCT_VIDEO_FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json() as {
      clientRequestId?: unknown;
      total?: unknown;
      fileSize?: unknown;
      mimeType?: unknown;
      durationSeconds?: unknown;
    };
    const clientRequestId = String(body.clientRequestId || "");
    const total = Number(body.total);
    const fileSize = Number(body.fileSize);
    planTempVideoUpload(fileSize);
    const mime = String(body.mimeType || "video/webm").split(";")[0].trim().toLowerCase();
    const durationSeconds = Math.round(Number(body.durationSeconds) * 100) / 100;
    const record = await finishChunkedTempVideo({
      userId: profile.id,
      clientRequestId,
      total,
      fileSize,
      mimeType: mime === "video/mp4" ? "video/mp4" : "video/webm",
      durationSeconds,
      read: (storagePath) => downloadStorageObject(AGROPRODUCT_TEMP_VIDEO_BUCKET, storagePath),
      remove: async (storagePath) => {
        await removeStorageObject(AGROPRODUCT_TEMP_VIDEO_BUCKET, storagePath);
      },
      findSaved: findOwnedTempVideo,
      save: saveOwnedTempVideo,
    });
    return NextResponse.json({
      success: true,
      video: { id: record.id, status: record.status, durationSeconds: record.durationSeconds },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
