import { NextResponse } from "next/server";
import { AcademyLessonVideoService } from "@/lib/academy/lesson-video-service";
import { requireLessonVideoEditor } from "@/lib/academy/lesson-video-api-auth";
import { toCourseMutationFailure } from "@/lib/academy/course-errors";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ lessonId: string }> }
) {
  const auth = await requireLessonVideoEditor();
  if (!auth.ok) {
    return NextResponse.json({ success: false, code: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const { lessonId } = await context.params;

  try {
    const lesson = await AcademyLessonVideoService.completeUpload({
      ownerId: auth.profile.id,
      lessonId,
      storagePath: String(body.storagePath || ""),
      fileName: String(body.fileName || body.filename || ""),
      fileSize: Number(body.fileSize || 0),
      mimeType: String(body.mimeType || ""),
      replace: Boolean(body.replace),
    });
    return NextResponse.json({ success: true, lesson });
  } catch (error) {
    const failure = toCourseMutationFailure(error);
    return NextResponse.json(failure, { status: failure.code === "UNAUTHORIZED" ? 403 : 400 });
  }
}
