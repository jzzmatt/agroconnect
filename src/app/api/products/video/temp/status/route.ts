import { NextResponse } from "next/server";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { isUuid } from "@/lib/products/ids";
import { confirmedSavedVideoReference } from "@/lib/products/temp-video-lifecycle";
import { findOwnedTempVideoById } from "@/lib/products/temp-video-runtime";

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
    const record = await findOwnedTempVideoById(profile.id, tempId);
    const confirmed = confirmedSavedVideoReference(record);
    if (!record || !confirmed) {
      return NextResponse.json({ success: false, confirmed: false, code: "TEMP_VIDEO_NOT_READY" }, { status: 409 });
    }
    return NextResponse.json({
      success: true,
      confirmed: true,
      video: { id: confirmed.id, status: record.status },
    });
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : "TEMP_VIDEO_FAILED";
    console.error("[product temp video] status failed", code);
    return NextResponse.json({ success: false, confirmed: false, code }, { status: 500 });
  }
}
