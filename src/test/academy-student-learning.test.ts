import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolveLearnAccess } from "@/lib/academy/learn-access";
import { canAccessLessonVideo } from "@/lib/academy/video-playback";
import { EnrollmentService } from "@/lib/services/enrollment-service";
import { CourseService } from "@/lib/services/course-service";
import { isPubliclyVisibleCourseStatus } from "@/lib/academy/course-lifecycle";
import type { CourseWithSections } from "@/types/agriacademy";

const STUDENT = "student-8";
const OWNER = "instructor-8";

function courseTree(status: CourseWithSections["status"] = "published"): CourseWithSections {
  return {
    id: "crs-learn",
    owner_id: OWNER,
    title: "Produção de Milho",
    slug: "producao-milho-8",
    description: "Curso completo",
    level: "beginner",
    price: 0,
    currency: "AOA",
    status,
    lessons_count: 2,
    students_count: 0,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sections: [
      {
        id: "sec-1",
        course_id: "crs-learn",
        title: "Introdução",
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lessons: [
          {
            id: "les-1",
            course_id: "crs-learn",
            section_id: "sec-1",
            title: "Apresentação",
            sort_order: 1,
            youtube_video_id: "dQw4w9WgXcQ",
            is_free_preview: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "les-2",
            course_id: "crs-learn",
            section_id: "sec-1",
            title: "Plantação",
            sort_order: 2,
            youtube_video_id: "jNQXAC9IVRw",
            is_free_preview: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      },
    ],
  };
}

describe("AGROCONNECT Phase 8 — Student learning experience", () => {
  beforeEach(() => {
    EnrollmentService.resetMemoryStore();
    CourseService.resetMemoryStore();
  });

  it("requires authentication before opening a published course", () => {
    const result = resolveLearnAccess({
      course: courseTree(),
      profileId: null,
      enrolled: false,
      isOwner: false,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe("auth_required");
  });

  it("hides unpublished courses from anonymous and non-enrolled viewers", () => {
    const paused = courseTree("paused");
    const anonymous = resolveLearnAccess({
      course: paused,
      profileId: null,
      enrolled: false,
      isOwner: false,
    });
    expect(anonymous.allowed).toBe(false);
    if (!anonymous.allowed) expect(anonymous.reason).toBe("not_found");

    const stranger = resolveLearnAccess({
      course: paused,
      profileId: STUDENT,
      enrolled: false,
      isOwner: false,
    });
    expect(stranger.allowed).toBe(false);
    if (!stranger.allowed) expect(stranger.reason).toBe("not_found");
  });

  it("rejects non-enrolled authenticated users on a published course", () => {
    const result = resolveLearnAccess({
      course: courseTree(),
      profileId: STUDENT,
      enrolled: false,
      isOwner: false,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe("not_enrolled");
  });

  it("allows enrolled students on a published course and resumes last lesson", () => {
    const result = resolveLearnAccess({
      course: courseTree(),
      profileId: STUDENT,
      enrolled: true,
      isOwner: false,
      lastLessonId: "les-2",
    });
    expect(result.allowed).toBe(true);
    if (result.allowed) expect(result.startLesson.id).toBe("les-2");
  });

  it("blocks enrolled students from watching a paused course", () => {
    const result = resolveLearnAccess({
      course: courseTree("paused"),
      profileId: STUDENT,
      enrolled: true,
      isOwner: false,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe("course_unavailable");
    expect(isPubliclyVisibleCourseStatus("paused")).toBe(false);
    expect(
      canAccessLessonVideo({
        courseStatus: "paused",
        isEnrolled: true,
        isOwner: false,
      })
    ).toBe(false);
  });

  it("lets the instructor preview even when the course is not published", () => {
    const result = resolveLearnAccess({
      course: courseTree("draft"),
      profileId: OWNER,
      enrolled: false,
      isOwner: true,
    });
    expect(result.allowed).toBe(true);
  });

  it("persists last opened lesson independently of YouTube", async () => {
    await EnrollmentService.enroll(STUDENT, "crs-learn");
    const updated = await EnrollmentService.recordLastLesson(STUDENT, "crs-learn", "les-2");
    expect(updated?.last_lesson_id).toBe("les-2");
    const current = await EnrollmentService.getActiveEnrollment(STUDENT, "crs-learn");
    expect(current?.last_lesson_id).toBe("les-2");
  });

  it("does not record progress for a student who is not enrolled", async () => {
    const updated = await EnrollmentService.recordLastLesson(STUDENT, "crs-learn", "les-2");
    expect(updated).toBeNull();
  });

  it("keeps paused courses out of the public catalogue while enrollment remains", async () => {
    const created = await CourseService.createCourse(OWNER, { title: "Curso pausado" });
    await CourseService.updateCourse(OWNER, { id: created.id, status: "published" });
    await CourseService.updateCourse(OWNER, { id: created.id, status: "paused" });
    await EnrollmentService.enroll(STUDENT, created.id);

    const { courses } = await CourseService.searchPublishedCourses();
    expect(courses.some((course) => course.id === created.id)).toBe(false);

    const learner = await CourseService.getLearnerCourseDetailBySlug(created.slug);
    expect(learner?.id).toBe(created.id);
    expect(learner?.status).toBe("paused");
    expect(await EnrollmentService.isEnrolled(STUDENT, created.id)).toBe(true);
  });

  it("documents the Unlisted YouTube limitation for students", () => {
    const learn = readFileSync("src/components/academy/CourseLearnClient.tsx", "utf8");
    expect(learn).toMatch("youtubeUnlistedStudentHint");
    expect(existsSync("supabase/migrations/20260827000001_036_phase8_enrollment_progress.sql")).toBe(true);
  });
});
