import { NextResponse } from "next/server";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { isUuid } from "@/lib/products/ids";
import { AuthorizationError, requireProductOwnership, subjectFromProfile } from "@/lib/authorization/server";
import { finalizeOwnedTempVideo } from "@/lib/products/temp-video-runtime";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile || !isUuid(profile.id)) {
      return NextResponse.json({ success: false, code: "AUTH_REQUIRED" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const tempId = String(body.tempId || "");
    const productId = String(body.productId || "");
    if (!isUuid(tempId) || !isUuid(productId)) {
      return NextResponse.json({ success: false, code: "INVALID_REQUEST" }, { status: 400 });
    }
    await requireProductOwnership(productId, subjectFromProfile(profile));
    const record = await finalizeOwnedTempVideo(profile.id, tempId, productId);
    return NextResponse.json({ success: true, video: { id: record.id, status: record.status } });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ success: false, code: "PRODUCT_FORBIDDEN" }, { status: 403 });
    }
    const code = error && typeof error === "object" && "code" in error ? String((error as { code: string }).code) : "TEMP_VIDEO_FAILED";
    const status = code === "TEMP_VIDEO_NOT_FOUND" ? 404 : code === "TEMP_VIDEO_DELETE_UNCONFIRMED" || code === "PERMANENT_VIDEO_UNREADABLE" ? 409 : 500;
    console.error("[product temp video] finalize failed");
    return NextResponse.json({ success: false, code }, { status });
  }
}
