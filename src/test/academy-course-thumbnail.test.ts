import { describe, expect, it } from "vitest";
import {
  ACADEMY_COURSE_THUMBNAIL_MAX_BYTES,
  buildCourseThumbnailStoragePath,
  courseHasStoredThumbnail,
  validateCourseThumbnailFileMeta,
} from "@/lib/academy/course-thumbnail";

describe("Academy course thumbnail validation", () => {
  it("accepts jpg/png/webp within limit", () => {
    expect(
      validateCourseThumbnailFileMeta({ fileName: "cover.jpg", fileSize: 1000, mimeType: "image/jpeg" })
    ).toMatchObject({ ok: true, extension: "jpg" });
    expect(
      validateCourseThumbnailFileMeta({ fileName: "cover.PNG", fileSize: 1000, mimeType: "image/png" })
    ).toMatchObject({ ok: true, extension: "png" });
    expect(
      validateCourseThumbnailFileMeta({ fileName: "cover.webp", fileSize: 1000, mimeType: "image/webp" })
    ).toMatchObject({ ok: true, extension: "webp" });
  });

  it("rejects oversize and unsupported files", () => {
    expect(
      validateCourseThumbnailFileMeta({
        fileName: "big.jpg",
        fileSize: ACADEMY_COURSE_THUMBNAIL_MAX_BYTES + 1,
        mimeType: "image/jpeg",
      })
    ).toEqual({ ok: false, code: "THUMBNAIL_FILE_TOO_LARGE" });
    expect(
      validateCourseThumbnailFileMeta({ fileName: "doc.pdf", fileSize: 1000, mimeType: "application/pdf" })
    ).toEqual({ ok: false, code: "THUMBNAIL_FORMAT_UNSUPPORTED" });
  });

  it("builds ownership-aware storage paths", () => {
    expect(
      buildCourseThumbnailStoragePath({ ownerId: "owner-1", courseId: "course-1", extension: "webp" })
    ).toBe("owner-1/course-1/thumbnail.webp");
  });

  it("detects stored thumbnails", () => {
    expect(courseHasStoredThumbnail({ thumbnail_storage_path: "a/b/thumbnail.jpg" })).toBe(true);
    expect(courseHasStoredThumbnail({ thumbnail_url: "https://legacy.example/x.jpg" })).toBe(true);
    expect(courseHasStoredThumbnail({})).toBe(false);
  });
});
