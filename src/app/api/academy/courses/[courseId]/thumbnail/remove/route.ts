import { NextResponse } from "next/server";
import { AcademyCourseThumbnailService } from "@/lib/academy/course-thumbnail-service";
import { requireCourseThumbnailEditor } from "@/lib/academy/course-thumbnail-api-auth";
import { toCourseMutationFailure } from "@/lib/academy/course-errors";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await context.params;
  const auth = await requireCourseThumbnailEditor(courseId);
  if (!auth.ok) {
    return NextResponse.json({ success: false, code: auth.error }, { status: auth.status });
  }

  try {
    const course = await AcademyCourseThumbnailService.removeThumbnail({
      ownerId: auth.profile.id,
      courseId,
    });
    return NextResponse.json({ success: true, course });
  } catch (error) {
    const failure = toCourseMutationFailure(error);
    return NextResponse.json(failure, { status: failure.code === "UNAUTHORIZED" ? 403 : 400 });
  }
}
