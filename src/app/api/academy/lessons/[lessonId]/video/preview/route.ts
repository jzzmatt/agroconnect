import { NextResponse } from "next/server";
import { requireLessonVideoEditor } from "@/lib/academy/lesson-video-api-auth";
import { AcademyLessonVideoService } from "@/lib/academy/lesson-video-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ lessonId: string }> }
) {
  const auth = await requireLessonVideoEditor();
  if (!auth.ok) {
    return NextResponse.json({ success: false, code: auth.error }, { status: auth.status });
  }

  const { lessonId } = await context.params;
  const signed = await AcademyLessonVideoService.getOwnerPreviewUrl({
    ownerId: auth.profile.id,
    lessonId,
  });

  if (!signed) {
    return NextResponse.json({ success: false, code: "NO_VIDEO" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    playbackUrl: signed.signedUrl,
    expiresAt: signed.expiresAt,
  });
}
