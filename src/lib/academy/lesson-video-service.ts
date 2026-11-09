import "server-only";

import { randomUUID } from "crypto";
import { getAcademyWritableClient } from "@/lib/academy/supabase-client";
import { CoursePersistenceError, COURSE_MUTATION_MESSAGES } from "@/lib/academy/course-errors";
import { analyzeYouTubeInput } from "@/lib/academy/youtube";
import {
  buildLessonUploadStoragePath,
  optionalLessonDurationSeconds,
  validateLessonVideoFileMeta,
  type LessonVideoSource,
} from "@/lib/academy/lesson-video";
import {
  assembleLessonVideoChunks,
  assertLessonChunkPlan,
  lessonChunkContentType,
  lessonVideoChunkPath,
  LESSON_VIDEO_PART_MAX_BYTES,
} from "@/lib/academy/lesson-video-chunks";
import {
  createLessonVideoSignedPlaybackUrl,
  createLessonVideoSignedUploadUrl,
  lessonVideoObjectExists,
  removeLessonVideoObject,
} from "@/lib/academy/lesson-video-storage";
import { ACADEMY_VIDEOS_BUCKET } from "@/lib/academy/lesson-video";
import { downloadStorageObject, removeStorageObject, uploadBufferToStorage } from "@/lib/media/supabase-storage-core";
import type { CourseLessonRecord } from "@/types/agriacademy";

const LESSONS_TABLE = "course_lessons";
const COURSES_TABLE = "courses";

function hasLiveSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

async function getOwnedLesson(ownerId: string, lessonId: string) {
  if (!hasLiveSupabase()) return null;
  const supabase = await getAcademyWritableClient();
  const { data: lesson, error } = await (supabase.from(LESSONS_TABLE) as any)
    .select(
      "id, course_id, section_id, title, description, sort_order, academy_video_id, youtube_video_id, youtube_source_url, duration_seconds, is_free_preview, video_source, upload_storage_path, upload_original_filename, upload_original_size, upload_original_mime_type, upload_status, created_at, updated_at"
    )
    .eq("id", lessonId)
    .maybeSingle();
  if (error || !lesson) return null;

  const { data: course } = await (supabase.from(COURSES_TABLE) as any)
    .select("id, owner_id")
    .eq("id", lesson.course_id)
    .maybeSingle();

  if (!course || course.owner_id !== ownerId) return null;
  return { lesson, course };
}

function normalizeLesson(row: Record<string, unknown>): CourseLessonRecord {
  return {
    id: String(row.id),
    course_id: String(row.course_id),
    section_id: String(row.section_id),
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    sort_order: Number(row.sort_order ?? 0),
    academy_video_id: (row.academy_video_id as string | null) ?? null,
    youtube_video_id: (row.youtube_video_id as string | null) ?? null,
    youtube_source_url: (row.youtube_source_url as string | null) ?? null,
    video_source: ((row.video_source as LessonVideoSource | null) ?? "youtube") as LessonVideoSource,
    upload_storage_path: (row.upload_storage_path as string | null) ?? null,
    upload_original_filename: (row.upload_original_filename as string | null) ?? null,
    upload_original_size: row.upload_original_size != null ? Number(row.upload_original_size) : null,
    upload_original_mime_type: (row.upload_original_mime_type as string | null) ?? null,
    upload_status: (row.upload_status as CourseLessonRecord["upload_status"]) ?? null,
    duration_seconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
    is_free_preview: Boolean(row.is_free_preview),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

export class AcademyLessonVideoService {
  public static async prepareUpload(params: {
    ownerId: string;
    lessonId: string;
    fileName: string;
    fileSize: number;
    mimeType?: string | null;
  }) {
    const validation = validateLessonVideoFileMeta({
      fileName: params.fileName,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
    });
    if (!validation.ok) {
      throw new CoursePersistenceError(validation.code, COURSE_MUTATION_MESSAGES[validation.code]);
    }

    const owned = await getOwnedLesson(params.ownerId, params.lessonId);
    if (!owned) {
      throw new CoursePersistenceError("UNAUTHORIZED", COURSE_MUTATION_MESSAGES.UNAUTHORIZED);
    }

    const assetId = randomUUID();
    const storagePath = buildLessonUploadStoragePath({
      ownerId: params.ownerId,
      courseId: owned.lesson.course_id,
      lessonId: params.lessonId,
      assetId,
      extension: validation.extension,
    });

    const signed = await createLessonVideoSignedUploadUrl(storagePath);

    const supabase = await getAcademyWritableClient();
    await (supabase.from(LESSONS_TABLE) as any)
      .update({
        upload_status: "uploading",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.lessonId);

    return {
      storagePath,
      signedUrl: signed.signedUrl,
      token: signed.token,
      mimeType: validation.mimeType,
    };
  }

  public static async completeUpload(params: {
    ownerId: string;
    lessonId: string;
    storagePath: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    replace?: boolean;
  }) {
    const validation = validateLessonVideoFileMeta({
      fileName: params.fileName,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
    });
    if (!validation.ok) {
      await removeLessonVideoObject(params.storagePath);
      throw new CoursePersistenceError(validation.code, COURSE_MUTATION_MESSAGES[validation.code]);
    }

    const owned = await getOwnedLesson(params.ownerId, params.lessonId);
    if (!owned) {
      await removeLessonVideoObject(params.storagePath);
      throw new CoursePersistenceError("UNAUTHORIZED", COURSE_MUTATION_MESSAGES.UNAUTHORIZED);
    }

    const expectedPrefix = `${params.ownerId}/${owned.lesson.course_id}/${params.lessonId}/`;
    if (!params.storagePath.startsWith(expectedPrefix)) {
      await removeLessonVideoObject(params.storagePath);
      throw new CoursePersistenceError("UNAUTHORIZED", COURSE_MUTATION_MESSAGES.UNAUTHORIZED);
    }

    const exists = await lessonVideoObjectExists(params.storagePath);
    if (!exists) {
      throw new CoursePersistenceError("DATABASE_ERROR", COURSE_MUTATION_MESSAGES.DATABASE_ERROR);
    }

    const previousPath = owned.lesson.upload_storage_path as string | null;
    const supabase = await getAcademyWritableClient();

    const { data, error } = await (supabase.from(LESSONS_TABLE) as any)
      .update({
        video_source: "upload",
        upload_storage_path: params.storagePath,
        upload_original_filename: params.fileName,
        upload_original_size: params.fileSize,
        upload_original_mime_type: validation.mimeType,
        upload_status: "ready",
        youtube_video_id: null,
        youtube_source_url: null,
        academy_video_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.lessonId)
      .select()
      .single();

    if (error || !data) {
      await removeLessonVideoObject(params.storagePath);
      throw new CoursePersistenceError("DATABASE_ERROR", COURSE_MUTATION_MESSAGES.DATABASE_ERROR, error);
    }

    if (params.replace && previousPath && previousPath !== params.storagePath) {
      await removeLessonVideoObject(previousPath);
    }

    return normalizeLesson(data as Record<string, unknown>);
  }

  public static async saveUploadChunk(params: {
    ownerId: string;
    lessonId: string;
    clientRequestId: string;
    index: number;
    total: number;
    fileName: string;
    fileSize: number;
    mimeType?: string | null;
    bytes: Buffer;
  }) {
    if (params.bytes.length <= 0 || params.bytes.length > LESSON_VIDEO_PART_MAX_BYTES) {
      throw new CoursePersistenceError("VIDEO_FILE_TOO_LARGE", COURSE_MUTATION_MESSAGES.VIDEO_FILE_TOO_LARGE);
    }
    const owned = await getOwnedLesson(params.ownerId, params.lessonId);
    if (!owned) {
      throw new CoursePersistenceError("UNAUTHORIZED", COURSE_MUTATION_MESSAGES.UNAUTHORIZED);
    }
    assertLessonChunkPlan({ fileSize: params.fileSize, total: params.total, index: params.index });
    const contentType = lessonChunkContentType(params.fileName, params.mimeType, params.fileSize);
    const storagePath = lessonVideoChunkPath({
      ownerId: params.ownerId,
      courseId: String(owned.lesson.course_id),
      lessonId: params.lessonId,
      clientRequestId: params.clientRequestId,
      index: params.index,
      total: params.total,
    });
    await uploadBufferToStorage({
      bucket: ACADEMY_VIDEOS_BUCKET,
      storagePath,
      buffer: params.bytes,
      contentType,
    });
    return { received: params.index };
  }

  public static async completeChunkedUpload(params: {
    ownerId: string;
    lessonId: string;
    clientRequestId: string;
    total: number;
    fileName: string;
    fileSize: number;
    mimeType?: string | null;
    durationSeconds?: unknown;
  }) {
    const owned = await getOwnedLesson(params.ownerId, params.lessonId);
    if (!owned) {
      throw new CoursePersistenceError("UNAUTHORIZED", COURSE_MUTATION_MESSAGES.UNAUTHORIZED);
    }
    const contentType = lessonChunkContentType(params.fileName, params.mimeType, params.fileSize);
    const validation = validateLessonVideoFileMeta({
      fileName: params.fileName,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
    });
    if (!validation.ok) {
      throw new CoursePersistenceError(validation.code, COURSE_MUTATION_MESSAGES[validation.code]);
    }
    assertLessonChunkPlan({ fileSize: params.fileSize, total: params.total });
    const storagePath = buildLessonUploadStoragePath({
      ownerId: params.ownerId,
      courseId: String(owned.lesson.course_id),
      lessonId: params.lessonId,
      assetId: params.clientRequestId,
      extension: validation.extension,
    });
    const alreadySaved =
      owned.lesson.upload_status === "ready" &&
      owned.lesson.upload_storage_path === storagePath &&
      Number(owned.lesson.upload_original_size) === params.fileSize;
    if (alreadySaved) {
      return normalizeLesson(owned.lesson as Record<string, unknown>);
    }

    const bytes = await assembleLessonVideoChunks({
      ownerId: params.ownerId,
      courseId: String(owned.lesson.course_id),
      lessonId: params.lessonId,
      clientRequestId: params.clientRequestId,
      total: params.total,
      fileSize: params.fileSize,
      read: (path) => downloadStorageObject(ACADEMY_VIDEOS_BUCKET, path),
    });
    await uploadBufferToStorage({
      bucket: ACADEMY_VIDEOS_BUCKET,
      storagePath,
      buffer: bytes,
      contentType,
    });

    const previousPath = owned.lesson.upload_storage_path as string | null;
    const supabase = await getAcademyWritableClient();
    const { data, error } = await (supabase.from(LESSONS_TABLE) as any)
      .update({
        video_source: "upload",
        upload_storage_path: storagePath,
        upload_original_filename: params.fileName,
        upload_original_size: params.fileSize,
        upload_original_mime_type: contentType,
        upload_status: "ready",
        duration_seconds: optionalLessonDurationSeconds(params.durationSeconds),
        youtube_video_id: null,
        youtube_source_url: null,
        academy_video_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.lessonId)
      .select()
      .single();

    if (error || !data) {
      await removeLessonVideoObject(storagePath);
      throw new CoursePersistenceError("DATABASE_ERROR", COURSE_MUTATION_MESSAGES.DATABASE_ERROR, error);
    }

    for (let index = 0; index < params.total; index += 1) {
      const chunkPath = lessonVideoChunkPath({
        ownerId: params.ownerId,
        courseId: String(owned.lesson.course_id),
        lessonId: params.lessonId,
        clientRequestId: params.clientRequestId,
        index,
        total: params.total,
      });
      await removeStorageObject(ACADEMY_VIDEOS_BUCKET, chunkPath);
    }
    if (previousPath && previousPath !== storagePath) {
      await removeLessonVideoObject(previousPath);
    }
    return normalizeLesson(data as Record<string, unknown>);
  }

  public static async assignYouTube(params: {
    ownerId: string;
    lessonId: string;
    urlOrId: string;
  }) {
    const owned = await getOwnedLesson(params.ownerId, params.lessonId);
    if (!owned) {
      throw new CoursePersistenceError("UNAUTHORIZED", COURSE_MUTATION_MESSAGES.UNAUTHORIZED);
    }

    const analysis = analyzeYouTubeInput(params.urlOrId);
    if (!analysis.ok) {
      throw new CoursePersistenceError("YOUTUBE_URL_INVALID", COURSE_MUTATION_MESSAGES.YOUTUBE_URL_INVALID);
    }

    const previousUploadPath = owned.lesson.upload_storage_path as string | null;
    const supabase = await getAcademyWritableClient();

    const { data, error } = await (supabase.from(LESSONS_TABLE) as any)
      .update({
        video_source: "youtube",
        youtube_video_id: analysis.videoId,
        youtube_source_url: analysis.normalizedUrl,
        upload_storage_path: null,
        upload_original_filename: null,
        upload_original_size: null,
        upload_original_mime_type: null,
        upload_status: null,
        academy_video_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.lessonId)
      .select()
      .single();

    if (error || !data) {
      throw new CoursePersistenceError("DATABASE_ERROR", COURSE_MUTATION_MESSAGES.DATABASE_ERROR, error);
    }

    if (previousUploadPath) {
      await removeLessonVideoObject(previousUploadPath);
    }

    return normalizeLesson(data as Record<string, unknown>);
  }

  public static async removeLessonVideo(params: { ownerId: string; lessonId: string }) {
    const owned = await getOwnedLesson(params.ownerId, params.lessonId);
    if (!owned) {
      throw new CoursePersistenceError("UNAUTHORIZED", COURSE_MUTATION_MESSAGES.UNAUTHORIZED);
    }

    const previousPath = owned.lesson.upload_storage_path as string | null;
    const supabase = await getAcademyWritableClient();

    const { data, error } = await (supabase.from(LESSONS_TABLE) as any)
      .update({
        video_source: "youtube",
        youtube_video_id: null,
        youtube_source_url: null,
        upload_storage_path: null,
        upload_original_filename: null,
        upload_original_size: null,
        upload_original_mime_type: null,
        upload_status: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.lessonId)
      .select()
      .single();

    if (error || !data) {
      throw new CoursePersistenceError("DATABASE_ERROR", COURSE_MUTATION_MESSAGES.DATABASE_ERROR, error);
    }

    if (previousPath) {
      await removeLessonVideoObject(previousPath);
    }

    return normalizeLesson(data as Record<string, unknown>);
  }

  public static async getOwnerPreviewUrl(params: { ownerId: string; lessonId: string }) {
    const owned = await getOwnedLesson(params.ownerId, params.lessonId);
    if (!owned) return null;
    if (owned.lesson.video_source !== "upload" || !owned.lesson.upload_storage_path) return null;
    if (owned.lesson.upload_status !== "ready") return null;

    return createLessonVideoSignedPlaybackUrl(String(owned.lesson.upload_storage_path));
  }
}
