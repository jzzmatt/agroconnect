import { describe, it, expect, beforeEach } from "vitest";
import { AcademyAuthoringService } from "@/lib/academy/authoring-service";
import {
  formatChapterNumber,
  formatLessonNumber,
  nextSortOrder,
  reorderItems,
} from "@/lib/academy/lesson-numbering";
import { validateCourseForPublication } from "@/lib/academy/publication-validation";
import { canTransitionCourseStatus, isPubliclyVisibleCourseStatus } from "@/lib/academy/course-lifecycle";
import { CourseService } from "@/lib/services/course-service";
import { AcademyVideoService } from "@/lib/services/academy-video-service";
import { can, type CapabilitySubject } from "@/lib/authorization/policy";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import type { CourseWithSections } from "@/types/agriacademy";

const OWNER = "prof-seed-1";

function instructorSubject(plan: "basic" | "professional"): CapabilitySubject {
  const entitlements = getUserEntitlements({ subscriptionPlan: plan, roles: ["instructor"] });
  return {
    clerkUserId: "user_instructor",
    profileId: OWNER,
    roles: ["instructor"],
    accountType: "instructor",
    plan: entitlements.plan,
    subscriptionStatus: entitlements.subscription_status,
    entitlements,
  };
}

function draftCourseTree(): CourseWithSections {
  return {
    id: "crs-test",
    owner_id: OWNER,
    title: "Curso de teste",
    slug: "curso-teste",
    description: "Descrição completa",
    level: "beginner",
    price: 1000,
    currency: "AOA",
    status: "draft",
    lessons_count: 1,
    students_count: 0,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sections: [
      {
        id: "sec-1",
        course_id: "crs-test",
        title: "Introdução",
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lessons: [
          {
            id: "les-1",
            course_id: "crs-test",
            section_id: "sec-1",
            title: "Aula 1",
            sort_order: 1,
            academy_video_id: "vid-1",
            is_free_preview: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      },
    ],
  };
}

describe("AGROCONNECT Phase 7.1 — AgriAcademy Course Authoring", () => {
  beforeEach(() => {
    AcademyAuthoringService.resetMemoryStore();
    CourseService.resetMemoryStore();
  });

  it("1. Creates a course in draft state", async () => {
    const course = await CourseService.createCourse(OWNER, { title: "Horticultura Avançada" });
    expect(course.status).toBe("draft");
    expect(course.owner_id).toBe(OWNER);
  });

  it("2. Enforces course ownership on updates", async () => {
    const owned = await CourseService.updateCourse(OWNER, {
      id: "crs-seed-draft",
      title: "Atualizado",
    });
    expect(owned.success).toBe(true);
    if (owned.success) expect(owned.data.title).toBe("Atualizado");
    const denied = await CourseService.updateCourse("other-user", { id: "crs-seed-draft", title: "Hack" });
    expect(denied.success).toBe(false);
    if (!denied.success) expect(denied.code).toBe("UNAUTHORIZED");
  });

  it("3. Gates course authoring behind paid subscription entitlements", () => {
    expect(can(instructorSubject("basic"), "academy.course.create")).toBe(false);
    expect(can(instructorSubject("professional"), "academy.course.create")).toBe(true);
    expect(can(instructorSubject("professional"), "academy.course.publish")).toBe(true);
  });

  it("4. Creates chapters for a course", async () => {
    const section = await AcademyAuthoringService.createSection(OWNER, "crs-seed-draft", "Capítulo 2");
    expect(section?.course_id).toBe("crs-seed-draft");
    expect(section?.title).toBe("Capítulo 2");
  });

  it("5. Orders chapters by sort_order", async () => {
    await AcademyAuthoringService.createSection(OWNER, "crs-seed-draft", "Segundo");
    const tree = await AcademyAuthoringService.getCourseEditorTree("crs-seed-draft", OWNER);
    const orders = tree?.sections.map((section) => section.sort_order) || [];
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("6. Creates lessons inside a chapter", async () => {
    const lesson = await AcademyAuthoringService.createLesson(OWNER, "sec-seed-1", "Objetivos");
    expect(lesson?.section_id).toBe("sec-seed-1");
    expect(lesson?.title).toBe("Objetivos");
  });

  it("7. Orders lessons by sort_order", async () => {
    await AcademyAuthoringService.createLesson(OWNER, "sec-seed-1", "Aula B");
    const tree = await AcademyAuthoringService.getCourseEditorTree("crs-seed-draft", OWNER);
    const lessons = tree?.sections[0]?.lessons || [];
    expect(lessons.map((lesson) => lesson.sort_order)).toEqual([...lessons.map((l) => l.sort_order)].sort((a, b) => a - b));
  });

  it("8. Formats automatic chapter and lesson numbering", () => {
    expect(formatChapterNumber(2)).toBe("02");
    expect(formatLessonNumber(2, 3)).toBe("02.03");
    expect(nextSortOrder([{ sort_order: 1 }, { sort_order: 3 }])).toBe(4);
  });

  it("9. Reorders items by id list", () => {
    const reordered = reorderItems(
      [
        { id: "a", sort_order: 1 },
        { id: "b", sort_order: 2 },
      ],
      ["b", "a"]
    );
    expect(reordered.map((item) => item.id)).toEqual(["b", "a"]);
    expect(reordered[0].sort_order).toBe(1);
  });

  it("10. Reuses an existing video asset across lessons", async () => {
    await AcademyAuthoringService.assignLessonVideo(OWNER, "les-seed-1", "vid-shared");
    const lesson2 = await AcademyAuthoringService.createLesson(OWNER, "sec-seed-1", "Reutilização");
    expect(lesson2).toBeTruthy();
    await AcademyAuthoringService.assignLessonVideo(OWNER, lesson2!.id, "vid-shared");
    expect(AcademyAuthoringService.countVideoReferences("vid-shared")).toBe(2);
  });

  it("11. Associates a new video id with a lesson", async () => {
    const lesson = await AcademyAuthoringService.assignLessonVideo(OWNER, "les-seed-1", "vid-new");
    expect(lesson?.academy_video_id).toBe("vid-new");
  });

  it("12. Tracks video reference counts in memory model", async () => {
    await AcademyAuthoringService.assignLessonVideo(OWNER, "les-seed-1", "vid-count");
    const lesson2 = await AcademyAuthoringService.createLesson(OWNER, "sec-seed-1", "Outra");
    await AcademyAuthoringService.assignLessonVideo(OWNER, lesson2!.id, "vid-count");
    expect(AcademyAuthoringService.countVideoReferences("vid-count")).toBe(2);
  });

  it("13. Validates course structure before publication", () => {
    const invalid = validateCourseForPublication({
      ...draftCourseTree(),
      sections: [],
    });
    expect(invalid.ok).toBe(false);

    const valid = validateCourseForPublication(draftCourseTree());
    expect(valid.ok).toBe(true);
  });

  it("14. Supports pause transition from published", () => {
    expect(canTransitionCourseStatus("published", "paused")).toBe(true);
    expect(isPubliclyVisibleCourseStatus("paused")).toBe(false);
  });

  it("15. Supports resume transition back to published", () => {
    expect(canTransitionCourseStatus("paused", "published")).toBe(true);
    expect(isPubliclyVisibleCourseStatus("published")).toBe(true);
  });

  it("16. Archives courses without treating pause as delete", async () => {
    const archived = await CourseService.updateCourse(OWNER, {
      id: "crs-seed-draft",
      status: "archived",
    });
    expect(archived.success).toBe(true);
    if (archived.success) expect(archived.data.status).toBe("archived");
    expect(canTransitionCourseStatus("paused", "archived")).toBe(true);
  });

  it("17. Protects Bunny assets while lessons still reference them", () => {
    expect(AcademyVideoService.isOrphaned({ reference_count: 2, orphaned_at: null })).toBe(false);
    expect(AcademyVideoService.isOrphaned({ reference_count: 0, orphaned_at: new Date().toISOString() })).toBe(true);
  });

  it("18. Keeps draft and paused courses out of public catalogue", async () => {
    const { courses } = await CourseService.searchPublishedCourses();
    expect(courses.every((course) => course.status === "published")).toBe(true);
    expect(courses.some((course) => course.id === "crs-seed-draft")).toBe(false);
  });
});
