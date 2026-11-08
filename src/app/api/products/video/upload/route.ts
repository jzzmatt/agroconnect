import { NextResponse } from "next/server";
import { PRODUCT_VIDEO_MAX_BYTES } from "@/config/product-catalog";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { ProductVideoService } from "@/lib/services/product-video-service";
import { isUuid } from "@/lib/products/ids";
import {
  AuthorizationError,
  requireProductOwnership,
  subjectFromProfile,
} from "@/lib/authorization/server";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const productId = String(form.get("productId") || "");
    const videoId = String(form.get("videoId") || "");
    const file = form.get("file");
    if (!isUuid(productId) || !isUuid(videoId) || !(file instanceof File)) {
      return NextResponse.json({ success: false, code: "PRODUCT_VIDEO_INVALID" }, { status: 400 });
    }
    if (file.size <= 0 || file.size > PRODUCT_VIDEO_MAX_BYTES) {
      return NextResponse.json({ success: false, code: "PRODUCT_VIDEO_TOO_LARGE" }, { status: 400 });
    }

    try {
      await requireProductOwnership(productId, subjectFromProfile(profile));
    } catch (ownershipError) {
      if (ownershipError instanceof AuthorizationError) {
        return NextResponse.json(
          { success: false, code: ownershipError.code },
          { status: ownershipError.code === "AUTH_REQUIRED" ? 401 : 403 }
        );
      }
      throw ownershipError;
    }

    const saved = await ProductVideoService.saveUploadedFile({
      videoId,
      ownerId: profile.id,
      productId,
      buffer: Buffer.from(await file.arrayBuffer()),
      fileSize: file.size,
      contentType: file.type === "video/mp4" ? "video/mp4" : "video/webm",
    });
    if (!saved) {
      return NextResponse.json({ success: false, code: "MEDIA_UPLOAD_FAILED" }, { status: 400 });
    }
    return NextResponse.json({ success: true, video: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    console.warn("[product video] upload failed");
    return NextResponse.json(
      { success: false, code: "MEDIA_UPLOAD_FAILED", message: message || "MEDIA_UPLOAD_FAILED" },
      { status: /autorizado|unauthor/i.test(message) ? 401 : 500 }
    );
  }
}
