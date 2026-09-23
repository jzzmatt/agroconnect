import { NextResponse } from "next/server";
import { AcademyLessonVideoService } from "@/lib/academy/lesson-video-service";
import { requireLessonVideoEditor } from "@/lib/academy/lesson-video-api-auth";
import { toCourseMutationFailure } from "@/lib/academy/course-errors";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ lessonId: string }> }
) {
  const auth = await requireLessonVideoEditor();
  if (!auth.ok) {
    return NextResponse.json({ success: false, code: auth.error }, { status: auth.status });
  }

  const { lessonId } = await context.params;

  try {
    const lesson = await AcademyLessonVideoService.removeLessonVideo({
      ownerId: auth.profile.id,
      lessonId,
    });
    return NextResponse.json({ success: true, lesson });
  } catch (error) {
    const failure = toCourseMutationFailure(error);
    return NextResponse.json(failure, { status: failure.code === "UNAUTHORIZED" ? 403 : 400 });
  }
}
