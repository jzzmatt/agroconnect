import { NextResponse } from "next/server";
import { CoursePersistenceError } from "@/lib/academy/course-errors";
import { AcademyLessonVideoService } from "@/lib/academy/lesson-video-service";
import { requireLessonVideoEditor } from "@/lib/academy/lesson-video-api-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

function failure(error: unknown) {
  if (error instanceof CoursePersistenceError) {
    const status = error.code === "UNAUTHORIZED" ? 403 : error.code === "DATABASE_ERROR" ? 500 : 400;
    return NextResponse.json({ success: false, code: error.code }, { status });
  }
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code || "") : "";
  const status = code === "CHUNK_MISSING" ? 409 : code === "INVALID_REQUEST" || code === "VIDEO_FORMAT_UNSUPPORTED" || code === "VIDEO_FILE_TOO_LARGE" ? 400 : 500;
  console.error("[academy lesson video] complete failed", error instanceof Error ? error.message : code || "UPLOAD_FAILED");
  return NextResponse.json({ success: false, code: code || "UPLOAD_FAILED" }, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ lessonId: string }> }
) {
  const auth = await requireLessonVideoEditor();
  if (!auth.ok) {
    return NextResponse.json({ success: false, code: auth.error }, { status: auth.status });
  }
  const { lessonId } = await context.params;
  const body = await request.json().catch(() => ({}));
  try {
    const lesson = await AcademyLessonVideoService.completeChunkedUpload({
      ownerId: auth.profile.id,
      lessonId,
      clientRequestId: String(body.clientRequestId || ""),
      total: Number(body.total),
      fileName: String(body.fileName || ""),
      fileSize: Number(body.fileSize),
      mimeType: body.mimeType ? String(body.mimeType) : null,
      durationSeconds: body.durationSeconds,
    });
    return NextResponse.json({ success: true, lesson });
  } catch (error) {
    return failure(error);
  }
}
