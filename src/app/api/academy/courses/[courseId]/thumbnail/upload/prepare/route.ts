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
    const result = await AcademyCourseThumbnailService.prepareUpload({
      ownerId: auth.profile.id,
      courseId,
      fileName: String(body.fileName || body.filename || ""),
      fileSize: Number(body.fileSize || 0),
      mimeType: body.mimeType ? String(body.mimeType) : null,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const failure = toCourseMutationFailure(error);
    return NextResponse.json(failure, { status: failure.code === "UNAUTHORIZED" ? 403 : 400 });
  }
}
