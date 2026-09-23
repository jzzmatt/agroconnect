import { NextResponse } from "next/server";
import { AcademyCourseThumbnailService } from "@/lib/academy/course-thumbnail-service";
import { requireCourseThumbnailEditor } from "@/lib/academy/course-thumbnail-api-auth";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await context.params;
  const auth = await requireCourseThumbnailEditor(courseId);
  if (!auth.ok) {
    return NextResponse.json({ success: false, code: auth.error }, { status: auth.status });
  }

  const signed = await AcademyCourseThumbnailService.getOwnerDisplayUrl({
    ownerId: auth.profile.id,
    courseId,
  });

  if (!signed) {
    return NextResponse.json({ success: false, code: "NO_THUMBNAIL" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    displayUrl: signed.signedUrl,
    expiresAt: signed.expiresAt,
  });
}
