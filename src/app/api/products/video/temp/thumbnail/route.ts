import { NextResponse } from "next/server";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { isUuid } from "@/lib/products/ids";
import { assertProductThumbnailSource } from "@/lib/products/product-thumbnail-source";
import { generateProductThumbnail } from "@/lib/products/product-thumbnail-generation";
import { attachOwnedTempVideoThumbnail, findOwnedTempVideoById } from "@/lib/products/temp-video-runtime";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(error: unknown) {
  const explicit = error && typeof error === "object" && "code" in error ? (error as { code: unknown }).code : null;
  const code = typeof explicit === "string" && /^[A-Z0-9_]+$/.test(explicit)
    ? explicit
    : error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : "THUMBNAIL_GENERATION_FAILED";
  const status = code === "AUTH_REQUIRED"
    ? 401
    : code === "PRODUCT_VIDEO_FORBIDDEN"
      ? 403
      : code === "TEMP_VIDEO_NOT_FOUND"
        ? 404
        : code === "THUMBNAIL_SOURCE_UNSUPPORTED" || code === "INVALID_REQUEST"
          ? 400
          : code === "TEMP_VIDEO_NOT_READY" || code === "TEMP_VIDEO_BUSY"
            ? 409
            : 500;
  console.error("[product thumbnail] generation failed", error instanceof Error ? error.message : code);
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
    const tempId = String(form.get("tempId") || "");
    const productTitle = String(form.get("productTitle") || "");
    const file = form.get("file");
    if (!isUuid(tempId) || !(file instanceof File)) {
      return NextResponse.json({ success: false, code: "INVALID_REQUEST" }, { status: 400 });
    }
    assertProductThumbnailSource(file.type || "", file.size);
    const existing = await findOwnedTempVideoById(profile.id, tempId);
    if (!existing) return NextResponse.json({ success: false, code: "TEMP_VIDEO_NOT_FOUND" }, { status: 404 });
    if (existing.status !== "saved") {
      return NextResponse.json({ success: false, code: "TEMP_VIDEO_NOT_READY" }, { status: 409 });
    }
    if (existing.thumbnailTempPath) {
      return NextResponse.json({ success: true, thumbnail: true, alreadyStored: true });
    }

    const generated = await generateProductThumbnail({
      bytes: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type || "image/jpeg",
      productTitle,
    });
    const stored = await attachOwnedTempVideoThumbnail({
      userId: profile.id,
      tempId,
      bytes: generated,
      mimeType: "image/jpeg",
    });
    return NextResponse.json({
      success: true,
      thumbnail: Boolean(stored.thumbnailTempPath),
      alreadyStored: false,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
