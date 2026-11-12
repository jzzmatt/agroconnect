import { NextResponse } from "next/server";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { isUuid } from "@/lib/products/ids";
import { prepareOwnedDirectTempVideo } from "@/lib/products/temp-video-runtime";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  const explicit = error && typeof error === "object" && "code" in error ? (error as { code: unknown }).code : null;
  const code = typeof explicit === "string" && /^[A-Z0-9_]+$/.test(explicit)
    ? explicit
    : error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : "TEMP_VIDEO_FAILED";
  const status = code === "PRODUCT_VIDEO_TOO_LARGE" || code === "PRODUCT_VIDEO_TOO_LONG" || code === "PRODUCT_VIDEO_INVALID" || code === "INVALID_REQUEST"
    ? 400
    : code === "AUTH_REQUIRED"
      ? 401
      : code === "PRODUCT_VIDEO_FORBIDDEN"
        ? 403
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
    const body = await request.json() as {
      clientRequestId?: unknown;
      fileSize?: unknown;
      mimeType?: unknown;
      durationSeconds?: unknown;
    };
    const prepared = await prepareOwnedDirectTempVideo({
      userId: profile.id,
      clientRequestId: String(body.clientRequestId || ""),
      mimeType: String(body.mimeType || ""),
      fileSize: Number(body.fileSize),
      durationSeconds: Number(body.durationSeconds),
    });
    if (prepared.alreadySaved) {
      return NextResponse.json({ success: true, alreadySaved: true, video: { id: prepared.videoId } });
    }
    return NextResponse.json({
      success: true,
      alreadySaved: false,
      video: { id: prepared.videoId },
      upload: { signedUrl: prepared.signedUrl, token: prepared.token, path: prepared.path },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
