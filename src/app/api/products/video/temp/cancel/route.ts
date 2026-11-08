import { NextResponse } from "next/server";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { isUuid } from "@/lib/products/ids";
import { cancelOwnedTempVideo } from "@/lib/products/temp-video-runtime";

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
    if (!isUuid(tempId)) {
      return NextResponse.json({ success: false, code: "INVALID_REQUEST" }, { status: 400 });
    }
    const result = await cancelOwnedTempVideo(profile.id, tempId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code: string }).code) : "TEMP_VIDEO_FAILED";
    const status = code === "TEMP_VIDEO_NOT_FOUND" ? 404 : code === "TEMP_VIDEO_DELETE_UNCONFIRMED" || code === "TEMP_VIDEO_KEEP" ? 409 : 500;
    console.error("[product temp video] cancel failed");
    return NextResponse.json({ success: false, code }, { status });
  }
}
