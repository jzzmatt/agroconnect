import { NextResponse } from "next/server";
import { CoursePersistenceError } from "@/lib/academy/course-errors";
import { AcademyLessonVideoService } from "@/lib/academy/lesson-video-service";
import { LESSON_VIDEO_PART_MAX_BYTES } from "@/lib/academy/lesson-video-chunks";
import { requireLessonVideoEditor } from "@/lib/academy/lesson-video-api-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

function failure(error: unknown) {
  if (error instanceof CoursePersistenceError) {
    const status = error.code === "UNAUTHORIZED" ? 403 : error.code === "DATABASE_ERROR" ? 500 : 400;
    return NextResponse.json({ success: false, code: error.code }, { status });
  }
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code || "") : "";
  const status =
    code === "CHUNK_MISSING"
      ? 409
      : code === "INVALID_REQUEST" || code === "VIDEO_FORMAT_UNSUPPORTED" || code === "VIDEO_FILE_TOO_LARGE"
        ? 400
        : 500;
  console.error("[academy lesson video] chunk failed", error instanceof Error ? error.message : code || "UPLOAD_FAILED");
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
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size <= 0 || file.size > LESSON_VIDEO_PART_MAX_BYTES) {
      return NextResponse.json({ success: false, code: "VIDEO_FILE_TOO_LARGE" }, { status: 413 });
    }
    const received = await AcademyLessonVideoService.saveUploadChunk({
      ownerId: auth.profile.id,
      lessonId,
      clientRequestId: String(form.get("clientRequestId") || ""),
      index: Number(form.get("index")),
      total: Number(form.get("total")),
      fileName: String(form.get("fileName") || file.name || ""),
      fileSize: Number(form.get("fileSize")),
      mimeType: form.get("mimeType") ? String(form.get("mimeType")) : null,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({ success: true, ...received });
  } catch (error) {
    return failure(error);
  }
}
