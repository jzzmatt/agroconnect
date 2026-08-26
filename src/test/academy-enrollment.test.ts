import { describe, it, expect, beforeEach } from "vitest";
import { buildAuthorizedEmbedUrl, canAccessLessonVideo } from "@/lib/academy/video-playback";
import { validateCourseForPublication } from "@/lib/academy/publication-validation";
import { EnrollmentService } from "@/lib/services/enrollment-service";
import { resolveAuthRedirectUrl } from "@/lib/auth/redirect-url";
import { formatVideoDuration } from "@/lib/academy/format-duration";
import { buildCourseLearnPath } from "@/lib/academy/course-navigation";
import type { CourseWithSections } from "@/types/agriacademy";

const STUDENT = "student-1";
const COURSE_ID = "crs-published-1";

function publishedCourseTree(): CourseWithSections & {
  sections: Array<{ lessons?: Array<{ video?: { status: string } }> }>;
} {
  return {
    id: COURSE_ID,
    owner_id: "instructor-1",
    title: "Produção de Milho",
    slug: "producao-milho",
    description: "Curso completo de milho",
    level: "beginner",
    price: 0,
    currency: "AOA",
    status: "published",
    lessons_count: 1,
    students_count: 0,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sections: [
      {
        id: "sec-1",
        course_id: COURSE_ID,
        title: "Introdução",
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lessons: [
          {
            id: "les-1",
            course_id: COURSE_ID,
            section_id: "sec-1",
            title: "Apresentação",
            sort_order: 1,
            academy_video_id: "vid-1",
            is_free_preview: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            video: { status: "ready" as const },
          },
        ],
      },
    ],
  };
}

describe("AGROCONNECT Phase 7.1 — Enrollment & Protected Video Access", () => {
  beforeEach(() => {
    EnrollmentService.resetMemoryStore();
  });

  it("1. Enrolls an authenticated user in a published course", async () => {
    const enrollment = await EnrollmentService.enroll(STUDENT, COURSE_ID);
    expect(enrollment.course_id).toBe(COURSE_ID);
    expect(enrollment.student_id).toBe(STUDENT);
    expect(enrollment.status).toBe("active");
  });

  it("2. Prevents duplicate enrollment records (idempotent)", async () => {
    const first = await EnrollmentService.enroll(STUDENT, COURSE_ID);
    const second = await EnrollmentService.enroll(STUDENT, COURSE_ID);
    expect(second.id).toBe(first.id);
    expect(await EnrollmentService.isEnrolled(STUDENT, COURSE_ID)).toBe(true);
    const all = await EnrollmentService.listByStudent(STUDENT);
    expect(all.filter((item) => item.course_id === COURSE_ID)).toHaveLength(1);
  });

  it("3. Denies video access to anonymous users", () => {
    expect(
      canAccessLessonVideo({
        courseStatus: "published",
        isEnrolled: false,
        isOwner: false,
      })
    ).toBe(false);
  });

  it("4. Denies video access to authenticated but non-enrolled users", () => {
    expect(
      canAccessLessonVideo({
        courseStatus: "published",
        isEnrolled: false,
        isOwner: false,
      })
    ).toBe(false);
  });

  it("5. Allows video access to enrolled users on published courses", () => {
    expect(
      canAccessLessonVideo({
        courseStatus: "published",
        isEnrolled: true,
        isOwner: false,
      })
    ).toBe(true);
  });

  it("6. Allows course owners to preview lessons regardless of enrollment", () => {
    expect(
      canAccessLessonVideo({
        courseStatus: "draft",
        isEnrolled: false,
        isOwner: true,
      })
    ).toBe(true);
  });

  it("7. Allows free preview lessons without enrollment", () => {
    expect(
      canAccessLessonVideo({
        courseStatus: "published",
        isEnrolled: false,
        isOwner: false,
        isFreePreview: true,
      })
    ).toBe(true);
  });

  it("8. Builds embed URLs for ready and in-flight Bunny assets", () => {
    expect(
      buildAuthorizedEmbedUrl({
        bunny_video_id: "abc",
        bunny_library_id: "lib",
        status: "ready",
      })
    ).toBeTruthy();

    expect(
      buildAuthorizedEmbedUrl({
        bunny_video_id: "abc",
        bunny_library_id: "lib",
        status: "processing",
      })
    ).toBeTruthy();

    expect(
      buildAuthorizedEmbedUrl({
        bunny_video_id: "abc",
        bunny_library_id: "lib",
        status: "pending",
      })
    ).toBeNull();
  });

  it("9. Reuses stored playback_url when present", () => {
    const url = "https://iframe.mediadelivery.net/embed/123/abc";
    expect(
      buildAuthorizedEmbedUrl({
        bunny_video_id: "abc",
        bunny_library_id: null,
        status: "processing",
        playback_url: url,
      })
    ).toBe(url);
  });

  it("9b. Builds embed URLs for ready videos without stored playback_url", () => {
    const url = buildAuthorizedEmbedUrl({
      bunny_video_id: "abc",
      bunny_library_id: "lib-123",
      status: "ready",
      playback_url: null,
    });
    expect(url).toContain("iframe.mediadelivery.net/embed/lib-123/abc");
  });

  it("9. Blocks publication when videos are still processing", () => {
    const tree = publishedCourseTree();
    tree.sections[0].lessons![0].video = { status: "processing" };
    const result = validateCourseForPublication(tree);
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("processados"))).toBe(true);
  });

  it("10. Preserves intended course destination through auth redirect", () => {
    const courseUrl = "/agriacademy/courses/producao-milho?enroll=1";
    expect(resolveAuthRedirectUrl(courseUrl)).toBe(courseUrl);
    expect(resolveAuthRedirectUrl("https://evil.com")).toBe("/dashboard");
    expect(resolveAuthRedirectUrl(null)).toBe("/dashboard");
  });

  it("11. Formats video duration for media library display", () => {
    expect(formatVideoDuration(125)).toBe("2:05");
    expect(formatVideoDuration(3661)).toBe("1:01:01");
    expect(formatVideoDuration(null)).toBe("—");
  });

  it("12. Builds post-enrollment learning route", () => {
    expect(buildCourseLearnPath("producao-milho")).toBe("/agriacademy/courses/producao-milho/learn");
    expect(buildCourseLearnPath("producao-milho", "les-1")).toContain("lesson=les-1");
  });
});
