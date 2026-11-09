import { ACADEMY_LESSON_VIDEO_MAX_BYTES, validateLessonVideoFileMeta } from "@/lib/academy/lesson-video";

/** Same part size as product uploads, kept under the platform request-body limit. */
export const LESSON_VIDEO_CHUNK_BYTES = 3 * 1024 * 1024;
export const LESSON_VIDEO_PART_MAX_BYTES = 3_500_000;

const MAX_LESSON_CHUNKS = Math.ceil(ACADEMY_LESSON_VIDEO_MAX_BYTES / LESSON_VIDEO_CHUNK_BYTES);
const REQUEST_ID = /^[A-Za-z0-9_-]{16,80}$/;

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export function planLessonVideoUpload(fileSize: number): { total: number; chunkBytes: number } {
  if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > ACADEMY_LESSON_VIDEO_MAX_BYTES) {
    fail("VIDEO_FILE_TOO_LARGE");
  }
  return {
    total: Math.ceil(fileSize / LESSON_VIDEO_CHUNK_BYTES),
    chunkBytes: LESSON_VIDEO_CHUNK_BYTES,
  };
}

export function lessonVideoChunkPath(params: {
  ownerId: string;
  courseId: string;
  lessonId: string;
  clientRequestId: string;
  index: number;
  total: number;
}): string {
  if (!REQUEST_ID.test(params.clientRequestId)) fail("INVALID_REQUEST");
  for (const id of [params.ownerId, params.courseId, params.lessonId]) {
    if (!id || id.includes("/") || id.includes("..")) fail("INVALID_REQUEST");
  }
  if (
    !Number.isInteger(params.index) ||
    !Number.isInteger(params.total) ||
    params.total < 1 ||
    params.total > MAX_LESSON_CHUNKS ||
    params.index < 0 ||
    params.index >= params.total
  ) {
    fail("INVALID_REQUEST");
  }
  return `${params.ownerId}/${params.courseId}/${params.lessonId}/chunks/${params.clientRequestId}/${params.index}`;
}

export function assertLessonChunkPlan(params: { fileSize: number; total: number; index?: number }) {
  const plan = planLessonVideoUpload(params.fileSize);
  if (params.total !== plan.total) fail("INVALID_REQUEST");
  if (params.index != null && (!Number.isInteger(params.index) || params.index < 0 || params.index >= plan.total)) {
    fail("INVALID_REQUEST");
  }
  return plan;
}

export async function assembleLessonVideoChunks(params: {
  ownerId: string;
  courseId: string;
  lessonId: string;
  clientRequestId: string;
  total: number;
  fileSize: number;
  read: (path: string) => Promise<Buffer | null>;
}): Promise<Buffer> {
  const plan = assertLessonChunkPlan({ fileSize: params.fileSize, total: params.total });
  const parts: Buffer[] = [];
  for (let index = 0; index < plan.total; index += 1) {
    const path = lessonVideoChunkPath({
      ownerId: params.ownerId,
      courseId: params.courseId,
      lessonId: params.lessonId,
      clientRequestId: params.clientRequestId,
      index,
      total: plan.total,
    });
    const part = await params.read(path);
    if (!part || part.length === 0) fail("CHUNK_MISSING");
    parts.push(part);
  }
  const video = Buffer.concat(parts);
  if (video.length !== params.fileSize) fail("CHUNK_MISSING");
  return video;
}

export function lessonChunkContentType(fileName: string, mimeType: string | null | undefined, fileSize: number): string {
  const validation = validateLessonVideoFileMeta({ fileName, fileSize, mimeType });
  if (!validation.ok) fail(validation.code);
  return validation.mimeType;
}
