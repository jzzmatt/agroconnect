import { NextResponse } from "next/server";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { isUuid } from "@/lib/products/ids";
import { saveOwnedTempVideo } from "@/lib/products/temp-video-runtime";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code: string }).code) : "TEMP_VIDEO_FAILED";
  const status = code === "PRODUCT_VIDEO_TOO_LARGE" || code === "PRODUCT_VIDEO_TOO_LONG" || code === "PRODUCT_VIDEO_INVALID" || code === "INVALID_REQUEST"
    ? 400
    : code === "TEMP_VIDEO_BUSY"
      ? 409
      : 500;
  console.error("[product temp video] save failed");
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
    const file = form.get("file");
    const clientRequestId = String(form.get("clientRequestId") || "");
    const durationSeconds = Number(form.get("durationSeconds"));
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, code: "PRODUCT_VIDEO_INVALID" }, { status: 400 });
    }
    const record = await saveOwnedTempVideo({
      userId: profile.id,
      clientRequestId,
      mimeType: file.type || "video/webm",
      fileSize: file.size,
      durationSeconds,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({
      success: true,
      video: { id: record.id, status: record.status, durationSeconds: record.durationSeconds },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
