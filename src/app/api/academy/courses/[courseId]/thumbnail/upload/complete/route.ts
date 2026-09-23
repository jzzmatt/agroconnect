import { NextResponse } from "next/server";
import { AcademyCourseThumbnailService } from "@/lib/academy/course-thumbnail-service";
import { requireCourseThumbnailEditor } from "@/lib/academy/course-thumbnail-api-auth";
import { toCourseMutationFailure } from "@/lib/academy/course-errors";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await context.params;
  const auth = await requireCourseThumbnailEditor(courseId);
  if (!auth.ok) {
    return NextResponse.json({ success: false, code: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));

  try {
    const course = await AcademyCourseThumbnailService.completeUpload({
      ownerId: auth.profile.id,
      courseId,
      storagePath: String(body.storagePath || ""),
      fileName: String(body.fileName || ""),
      fileSize: Number(body.fileSize || 0),
      mimeType: String(body.mimeType || "image/jpeg"),
      replace: Boolean(body.replace),
    });
    return NextResponse.json({ success: true, course });
  } catch (error) {
    const failure = toCourseMutationFailure(error);
    return NextResponse.json(failure, { status: failure.code === "UNAUTHORIZED" ? 403 : 400 });
  }
}
