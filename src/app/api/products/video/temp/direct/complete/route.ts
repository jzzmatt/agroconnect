import { NextResponse } from "next/server";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { isUuid } from "@/lib/products/ids";
import { commitOwnedDirectTempVideo } from "@/lib/products/temp-video-runtime";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  const explicit = error && typeof error === "object" && "code" in error ? (error as { code: unknown }).code : null;
  const code = typeof explicit === "string" && /^[A-Z0-9_]+$/.test(explicit)
    ? explicit
    : error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : "TEMP_VIDEO_FAILED";
  const status = code === "PRODUCT_VIDEO_TOO_LARGE" || code === "PRODUCT_VIDEO_TOO_LONG" || code === "PRODUCT_VIDEO_INVALID" || code === "INVALID_REQUEST" || code === "TEMP_VIDEO_NOT_FOUND"
    ? 400
    : 500;
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
    const body = await request.json() as { clientRequestId?: unknown; fileSize?: unknown };
    const record = await commitOwnedDirectTempVideo({
      userId: profile.id,
      clientRequestId: String(body.clientRequestId || ""),
      fileSize: Number(body.fileSize),
    });
    return NextResponse.json({
      success: true,
      video: { id: record.id, status: record.status, durationSeconds: record.durationSeconds },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
