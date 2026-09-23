import { describe, expect, it } from "vitest";
import {
  ACADEMY_LESSON_VIDEO_MAX_BYTES,
  lessonHasPlayableVideo,
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
});
