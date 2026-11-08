import { NextResponse } from "next/server";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { isUuid } from "@/lib/products/ids";
import { AGROPRODUCT_TEMP_VIDEO_BUCKET } from "@/lib/media/supabase-buckets";
import { downloadStorageObject, removeStorageObject, uploadBufferToStorage } from "@/lib/media/supabase-storage-core";
import {
  TEMP_VIDEO_PART_MAX_BYTES,
  finishChunkedTempVideo,
  planTempVideoUpload,
  tempVideoChunkPath,
  tempVideoThumbnailStagingPath,
} from "@/lib/products/temp-video-chunks";
import { findOwnedTempVideo, saveOwnedTempVideo } from "@/lib/products/temp-video-runtime";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code: string }).code) : "TEMP_VIDEO_FAILED";
  const status = code === "PRODUCT_VIDEO_TOO_LARGE" || code === "PRODUCT_VIDEO_TOO_LONG" || code === "PRODUCT_VIDEO_INVALID" || code === "INVALID_REQUEST" || code === "THUMBNAIL_REQUIRED"
    ? 400
    : code === "CHUNK_MISSING" || code === "TEMP_VIDEO_BUSY"
      ? 409
      : 500;
  console.error("[product temp video] chunk failed");
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

    const form = await request.formData();
    const clientRequestId = String(form.get("clientRequestId") || "");
    const part = String(form.get("part") || "");
    const file = form.get("file");
    if (!(file instanceof File) || file.size <= 0 || file.size > TEMP_VIDEO_PART_MAX_BYTES) {
      return NextResponse.json({ success: false, code: "PRODUCT_VIDEO_TOO_LARGE" }, { status: 413 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());

    if (part === "thumbnail") {
      const path = tempVideoThumbnailStagingPath(profile.id, clientRequestId);
      await uploadBufferToStorage({
        bucket: AGROPRODUCT_TEMP_VIDEO_BUCKET,
        storagePath: path,
        buffer: bytes,
        contentType: "image/jpeg",
      });
      return NextResponse.json({ success: true, received: "thumbnail" });
    }

    if (part !== "video") {
      return NextResponse.json({ success: false, code: "INVALID_REQUEST" }, { status: 400 });
    }
    const index = Number(form.get("index"));
    const total = Number(form.get("total"));
    const fileSize = Number(form.get("fileSize"));
    planTempVideoUpload(fileSize);
    const mime = String(form.get("mimeType") || "video/webm").split(";")[0].trim().toLowerCase();
    const contentType = mime === "video/mp4" ? "video/mp4" : "video/webm";
    const path = tempVideoChunkPath(profile.id, clientRequestId, index, total);
    await uploadBufferToStorage({
      bucket: AGROPRODUCT_TEMP_VIDEO_BUCKET,
      storagePath: path,
      buffer: bytes,
      contentType,
    });
    if (index !== total - 1) {
      return NextResponse.json({ success: true, received: index });
    }

    const record = await finishChunkedTempVideo({
      userId: profile.id,
      clientRequestId,
      total,
      fileSize,
      mimeType: contentType,
      durationSeconds: Number(form.get("durationSeconds")),
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
