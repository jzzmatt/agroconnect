import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assembleLessonVideoChunks,
  LESSON_VIDEO_CHUNK_BYTES,
  lessonVideoChunkPath,
  planLessonVideoUpload,
} from "@/lib/academy/lesson-video-chunks";
import {
  ACADEMY_LESSON_VIDEO_MAX_BYTES,
  lessonHasPlayableVideo,
  optionalLessonDurationSeconds,
  validateLessonVideoFileMeta,
} from "@/lib/academy/lesson-video";
import { authorizeLessonPlayback } from "@/lib/academy/video-playback";

describe("Academy lesson upload video validation", () => {
  it("accepts mp4/webm/mov within size limit", () => {
    expect(
      validateLessonVideoFileMeta({ fileName: "lesson.mp4", fileSize: 1024, mimeType: "video/mp4" })
    ).toEqual({ ok: true, extension: "mp4", mimeType: "video/mp4" });
    expect(
      validateLessonVideoFileMeta({ fileName: "lesson.webm", fileSize: 1024, mimeType: "video/webm" })
    ).toMatchObject({ ok: true, extension: "webm" });
    expect(
      validateLessonVideoFileMeta({ fileName: "lesson.MOV", fileSize: 1024, mimeType: "video/quicktime" })
    ).toMatchObject({ ok: true, extension: "mov" });
  });

  it("rejects oversize and unsupported formats", () => {
    expect(
      validateLessonVideoFileMeta({
        fileName: "big.mp4",
        fileSize: ACADEMY_LESSON_VIDEO_MAX_BYTES + 1,
        mimeType: "video/mp4",
      })
    ).toEqual({ ok: false, code: "VIDEO_FILE_TOO_LARGE" });
    expect(
      validateLessonVideoFileMeta({ fileName: "clip.avi", fileSize: 1000, mimeType: "video/x-msvideo" })
    ).toEqual({ ok: false, code: "VIDEO_FORMAT_UNSUPPORTED" });
  });

  it("detects playable upload and legacy youtube lessons", () => {
    expect(
      lessonHasPlayableVideo({
        video_source: "upload",
        youtube_video_id: null,
        upload_storage_path: "owner/course/lesson/id/original.mp4",
        upload_status: "ready",
      })
    ).toBe(true);
    expect(
      lessonHasPlayableVideo({
        video_source: "upload",
        youtube_video_id: null,
        upload_storage_path: "path",
        upload_status: "uploading",
      })
    ).toBe(false);
    expect(
      lessonHasPlayableVideo({
        youtube_video_id: "dQw4w9WgXcQ",
        upload_storage_path: null,
        upload_status: null,
      })
    ).toBe(true);
  });

  it("authorizes enrolled upload playback without embed URL", () => {
    const course = { id: "course-1", owner_id: "owner-1", status: "published" };
    const lesson = {
      course_id: course.id,
      video_source: "upload" as const,
      youtube_video_id: null,
      upload_storage_path: "owner/course/lesson/v/original.mp4",
      upload_status: "ready" as const,
    };
    const result = authorizeLessonPlayback({
      profileId: "student-1",
      lesson,
      course,
      enrolled: true,
    });
    expect(result).toEqual({ allowed: true, source: "upload" });
  });

  it("plans lesson uploads past the product clip size and keeps any duration", () => {
    const overProductClip = 50 * 1024 * 1024;
    expect(planLessonVideoUpload(overProductClip).total).toBeGreaterThan(16);
    expect(planLessonVideoUpload(ACADEMY_LESSON_VIDEO_MAX_BYTES).total).toBe(
      Math.ceil(ACADEMY_LESSON_VIDEO_MAX_BYTES / LESSON_VIDEO_CHUNK_BYTES)
    );
    expect(() => planLessonVideoUpload(ACADEMY_LESSON_VIDEO_MAX_BYTES + 1)).toThrowError(
      expect.objectContaining({ code: "VIDEO_FILE_TOO_LARGE" })
    );
    expect(optionalLessonDurationSeconds(120)).toBe(120);
    expect(optionalLessonDurationSeconds(3600.126)).toBe(3600.13);
    expect(optionalLessonDurationSeconds(0)).toBeNull();
  });

  it("assembles stored chunks and reports a missing part", async () => {
    const clientRequestId = "11111111-1111-4111-8111-111111111111";
    const fileSize = LESSON_VIDEO_CHUNK_BYTES + 12;
    const total = 2;
    const base = {
      ownerId: "owner",
      courseId: "course",
      lessonId: "lesson",
      clientRequestId,
      total,
    };
    const store = new Map<string, Buffer>([
      [lessonVideoChunkPath({ ...base, index: 0 }), Buffer.alloc(LESSON_VIDEO_CHUNK_BYTES, 1)],
      [lessonVideoChunkPath({ ...base, index: 1 }), Buffer.alloc(12, 2)],
    ]);
    const video = await assembleLessonVideoChunks({
      ...base,
      fileSize,
      read: async (path) => store.get(path) ?? null,
    });
    expect(video.length).toBe(fileSize);
    expect(lessonVideoChunkPath({ ...base, index: 0 })).toContain("owner/course/lesson/chunks/");

    store.delete(lessonVideoChunkPath({ ...base, index: 1 }));
    await expect(
      assembleLessonVideoChunks({
        ...base,
        fileSize,
        read: async (path) => store.get(path) ?? null,
      })
    ).rejects.toMatchObject({ code: "CHUNK_MISSING" });
  });

  it("sends lesson video through the app into the academy bucket", () => {
    const modal = readFileSync(resolve("src/components/academy/LessonVideoModal.tsx"), "utf8");
    const client = readFileSync(resolve("src/lib/academy/upload-lesson-video-client.ts"), "utf8");
    const service = readFileSync(resolve("src/lib/academy/lesson-video-service.ts"), "utf8");
    const chunkRoute = readFileSync(
      resolve("src/app/api/academy/lessons/[lessonId]/video/upload/chunk/route.ts"),
      "utf8"
    );
    expect(modal).not.toContain("signedUrl");
    expect(modal).not.toContain("PRODUCT_VIDEO_MAX_SECONDS");
    expect(client).toContain("/video/upload/chunk");
    expect(client).not.toContain("signedUrl");
    expect(client).not.toContain("PRODUCT_VIDEO_MAX_SECONDS");
    expect(service).toContain("ACADEMY_VIDEOS_BUCKET");
    expect(service).toContain("uploadBufferToStorage");
    expect(service).not.toContain("PRODUCT_VIDEO_MAX_SECONDS");
    expect(chunkRoute).toContain("saveUploadChunk");
  });
});
