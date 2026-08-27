import { describe, it, expect, beforeEach } from "vitest";
import { AcademyAuthoringService } from "@/lib/academy/authoring-service";
import {
  formatChapterNumber,
  formatLessonNumber,
  moveOrderedId,
  nextSortOrder,
  repairSortOrders,
  reorderItems,
  sortOrdersAreSequential,
} from "@/lib/academy/lesson-numbering";
import { courseEditorFingerprint } from "@/lib/academy/editor-snapshot";
import {
  canPermanentlyDeleteCourse,
  deleteDialogForStatus,
} from "@/lib/academy/course-delete-flow";
import { validateCourseForPublication } from "@/lib/academy/publication-validation";
import { CoursePersistenceError } from "@/lib/academy/course-errors";
import { CourseService } from "@/lib/services/course-service";
import type { CourseWithSections } from "@/types/agriacademy";

const OWNER = "prof-seed-1";

describe("AGROCONNECT Phase 7.2.1 — Instructor editor stabilization", () => {
  beforeEach(() => {
    AcademyAuthoringService.resetMemoryStore();
    AcademyAuthoringService.clearMemoryStore();
    CourseService.resetMemoryStore();
  });

  it("creates chapters with sequential 01, 02, 03 positions from persisted rows", async () => {
    const a = await AcademyAuthoringService.createSection(OWNER, "crs-order", "Chapter A");
    const b = await AcademyAuthoringService.createSection(OWNER, "crs-order", "Chapter B");
    const c = await AcademyAuthoringService.createSection(OWNER, "crs-order", "Chapter C");
    expect([a?.sort_order, b?.sort_order, c?.sort_order]).toEqual([1, 2, 3]);
    expect(formatChapterNumber(a!.sort_order)).toBe("01");
    expect(formatChapterNumber(b!.sort_order)).toBe("02");
    expect(formatChapterNumber(c!.sort_order)).toBe("03");
    expect(nextSortOrder([a!, b!, c!])).toBe(4);
  });

  it("scopes lesson numbering to the parent chapter", async () => {
    const chapter1 = await AcademyAuthoringService.createSection(OWNER, "crs-order", "Chapter 01");
    const chapter2 = await AcademyAuthoringService.createSection(OWNER, "crs-order", "Chapter 02");
    const l1 = await AcademyAuthoringService.createLesson(OWNER, chapter1!.id, "Lesson A");
    const l2 = await AcademyAuthoringService.createLesson(OWNER, chapter1!.id, "Lesson B");
    const l3 = await AcademyAuthoringService.createLesson(OWNER, chapter1!.id, "Lesson C");
    const l4 = await AcademyAuthoringService.createLesson(OWNER, chapter2!.id, "Lesson A");
    const l5 = await AcademyAuthoringService.createLesson(OWNER, chapter2!.id, "Lesson B");

    expect([l1?.sort_order, l2?.sort_order, l3?.sort_order]).toEqual([1, 2, 3]);
    expect([l4?.sort_order, l5?.sort_order]).toEqual([1, 2]);
    expect(formatLessonNumber(chapter1!.sort_order, l1!.sort_order)).toBe("01.01");
    expect(formatLessonNumber(chapter1!.sort_order, l3!.sort_order)).toBe("01.03");
    expect(formatLessonNumber(chapter2!.sort_order, l4!.sort_order)).toBe("02.01");
    expect(formatLessonNumber(chapter2!.sort_order, l5!.sort_order)).toBe("02.02");
  });

  it("repairs duplicate sort_order values without changing ids", () => {
    const repaired = repairSortOrders([
      { id: "sec-b", sort_order: 1, created_at: "2026-01-02T00:00:00.000Z" },
      { id: "sec-a", sort_order: 1, created_at: "2026-01-01T00:00:00.000Z" },
      { id: "sec-c", sort_order: 1, created_at: "2026-01-03T00:00:00.000Z" },
    ]);
    expect(repaired.map((item) => item.id)).toEqual(["sec-a", "sec-b", "sec-c"]);
    expect(repaired.map((item) => item.sort_order)).toEqual([1, 2, 3]);
    expect(sortOrdersAreSequential(repaired)).toBe(true);
  });

  it("reorders chapters into sequential positions", async () => {
    const a = await AcademyAuthoringService.createSection(OWNER, "crs-order", "A");
    const b = await AcademyAuthoringService.createSection(OWNER, "crs-order", "B");
    const c = await AcademyAuthoringService.createSection(OWNER, "crs-order", "C");
    const reordered = await AcademyAuthoringService.reorderSections(OWNER, "crs-order", [
      c!.id,
      a!.id,
      b!.id,
    ]);
    expect(reordered.map((section) => section.id)).toEqual([c!.id, a!.id, b!.id]);
    expect(reordered.map((section) => section.sort_order)).toEqual([1, 2, 3]);
    expect(reorderItems(reordered, [a!.id, b!.id, c!.id]).map((item) => item.sort_order)).toEqual([
      1, 2, 3,
    ]);
  });

  it("reorders lessons sequentially within a chapter", async () => {
    const chapter = await AcademyAuthoringService.createSection(OWNER, "crs-order", "Capítulo");
    const a = await AcademyAuthoringService.createLesson(OWNER, chapter!.id, "A");
    const b = await AcademyAuthoringService.createLesson(OWNER, chapter!.id, "B");
    const c = await AcademyAuthoringService.createLesson(OWNER, chapter!.id, "C");
    const reordered = await AcademyAuthoringService.reorderLessons(OWNER, chapter!.id, [
      c!.id,
      b!.id,
      a!.id,
    ]);
    expect(reordered.map((lesson) => lesson.id)).toEqual([c!.id, b!.id, a!.id]);
    expect(reordered.map((lesson) => lesson.sort_order)).toEqual([1, 2, 3]);
  });

  it("swaps an id one position with moveOrderedId and rejects out-of-range moves", () => {
    expect(moveOrderedId(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveOrderedId(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
    expect(moveOrderedId(["a", "b", "c"], "a", -1)).toBeNull();
    expect(moveOrderedId(["a", "b", "c"], "c", 1)).toBeNull();
    expect(moveOrderedId(["a", "b", "c"], "missing", 1)).toBeNull();
  });

  it("resequences remaining chapters after deleting a middle chapter", async () => {
    const a = await AcademyAuthoringService.createSection(OWNER, "crs-order", "A");
    const b = await AcademyAuthoringService.createSection(OWNER, "crs-order", "B");
    const c = await AcademyAuthoringService.createSection(OWNER, "crs-order", "C");
    expect(await AcademyAuthoringService.deleteSection(OWNER, b!.id)).toBe(true);
    const tree = await AcademyAuthoringService.getCourseEditorTree("crs-order", OWNER);
    expect(tree?.sections.map((section) => section.id)).toEqual([a!.id, c!.id]);
    expect(tree?.sections.map((section) => section.sort_order)).toEqual([1, 2]);
    expect(sortOrdersAreSequential(tree!.sections)).toBe(true);
  });

  it("resequences remaining lessons after deleting a middle lesson", async () => {
    const chapter = await AcademyAuthoringService.createSection(OWNER, "crs-order", "Capítulo");
    const a = await AcademyAuthoringService.createLesson(OWNER, chapter!.id, "A");
    const b = await AcademyAuthoringService.createLesson(OWNER, chapter!.id, "B");
    const c = await AcademyAuthoringService.createLesson(OWNER, chapter!.id, "C");
    expect(await AcademyAuthoringService.deleteLesson(OWNER, b!.id)).toBe(true);
    const tree = await AcademyAuthoringService.getCourseEditorTree("crs-order", OWNER);
    const lessons = tree?.sections[0]?.lessons || [];
    expect(lessons.map((lesson) => lesson.id)).toEqual([a!.id, c!.id]);
    expect(lessons.map((lesson) => lesson.sort_order)).toEqual([1, 2]);
  });

  it("rejects unauthorized reorder instead of returning an empty success list", async () => {
    const a = await AcademyAuthoringService.createSection(OWNER, "crs-order", "A");
    await expect(
      AcademyAuthoringService.reorderSections("other-user", "crs-order", [a!.id])
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      AcademyAuthoringService.reorderLessons("other-user", "missing-section", [])
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      AcademyAuthoringService.reorderSections(OWNER, "crs-order", [])
    ).rejects.toBeInstanceOf(CoursePersistenceError);
  });

  it("reconstructs the editor tree from persisted CourseService metadata", async () => {
    const created = await CourseService.createCourse(OWNER, { title: "Título persistido" });
    const tree = await AcademyAuthoringService.getCourseEditorTree(created.id, OWNER);
    expect(tree?.title).toBe("Título persistido");
    expect(tree?.status).toBe("draft");
    expect(tree?.id).toBe(created.id);
  });

  it("assigns, replaces and removes a lesson YouTube reference without deleting the YouTube video", async () => {
    const chapter = await AcademyAuthoringService.createSection(OWNER, "crs-order", "Capítulo");
    const lesson = await AcademyAuthoringService.createLesson(OWNER, chapter!.id, "Aula");
    const assigned = await AcademyAuthoringService.assignLessonYouTubeVideo(
      OWNER,
      lesson!.id,
      "dQw4w9WgXcQ"
    );
    expect(assigned?.youtube_video_id).toBe("dQw4w9WgXcQ");
    const replaced = await AcademyAuthoringService.assignLessonYouTubeVideo(
      OWNER,
      lesson!.id,
      "jNQXAC9IVRw"
    );
    expect(replaced?.youtube_video_id).toBe("jNQXAC9IVRw");
    const removed = await AcademyAuthoringService.assignLessonYouTubeVideo(OWNER, lesson!.id, null);
    expect(removed?.youtube_video_id).toBeNull();
    expect(AcademyAuthoringService.countYouTubeReferences("dQw4w9WgXcQ")).toBe(0);
    expect(AcademyAuthoringService.countYouTubeReferences("jNQXAC9IVRw")).toBe(0);
  });

  it("includes chapters, lessons and video refs in the editor fingerprint", async () => {
    const chapter = await AcademyAuthoringService.createSection(OWNER, "crs-fp", "Capítulo");
    const before = await AcademyAuthoringService.getCourseEditorTree("crs-fp", OWNER);
    const fingerprintBefore = courseEditorFingerprint(before!);
    const lesson = await AcademyAuthoringService.createLesson(OWNER, chapter!.id, "Aula");
    await AcademyAuthoringService.assignLessonYouTubeVideo(OWNER, lesson!.id, "dQw4w9WgXcQ");
    const after = await AcademyAuthoringService.getCourseEditorTree("crs-fp", OWNER);
    expect(courseEditorFingerprint(after!)).not.toBe(fingerprintBefore);
  });

  it("publishes a valid course and rejects an incomplete one", async () => {
    const created = await CourseService.createCourse(OWNER, {
      title: "Curso válido",
      description: "Descrição completa",
    });
    const tree: CourseWithSections = {
      ...created,
      sections: [
        {
          id: "sec-valid",
          course_id: created.id,
          title: "Capítulo",
          sort_order: 1,
          created_at: created.created_at,
          updated_at: created.updated_at,
          lessons: [
            {
              id: "les-valid",
              course_id: created.id,
              section_id: "sec-valid",
              title: "Aula",
              sort_order: 1,
              youtube_video_id: "dQw4w9WgXcQ",
              is_free_preview: false,
              created_at: created.created_at,
              updated_at: created.updated_at,
            },
          ],
        },
      ],
    };
    expect(validateCourseForPublication(tree).ok).toBe(true);
    expect(validateCourseForPublication({ ...tree, sections: [] }).ok).toBe(false);
    expect(
      validateCourseForPublication({
        ...tree,
        sections: [
          {
            ...tree.sections[0],
            lessons: [{ ...tree.sections[0].lessons[0], youtube_video_id: null }],
          },
        ],
      }).ok
    ).toBe(false);

    const published = await CourseService.updateCourse(OWNER, { id: created.id, status: "published" });
    expect(published.success).toBe(true);
    if (published.success) expect(published.data.status).toBe("published");
  });

  it("does not treat a missing course update as success", async () => {
    const result = await CourseService.updateCourse(OWNER, {
      id: "missing-course",
      title: "Nope",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("COURSE_NOT_FOUND");
  });

  it("rejects unauthorized updates and invalid status transitions", async () => {
    const created = await CourseService.createCourse(OWNER, { title: "Rascunho" });
    const denied = await CourseService.updateCourse("other-user", {
      id: created.id,
      title: "Hack",
    });
    expect(denied.success).toBe(false);
    if (!denied.success) expect(denied.code).toBe("UNAUTHORIZED");

    const invalid = await CourseService.updateCourse(OWNER, {
      id: created.id,
      status: "paused",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.code).toBe("INVALID_STATE_TRANSITION");
  });

  it("deletes a draft course after confirmation semantics", async () => {
    const created = await CourseService.createCourse(OWNER, { title: "Rascunho a eliminar" });
    expect(deleteDialogForStatus(created.status)).toBe("confirm_delete");
    const deleted = await CourseService.deleteCourse(OWNER, created.id);
    expect(deleted.success).toBe(true);
    const missing = await CourseService.getOwnedCourse(OWNER, created.id);
    expect(missing.success).toBe(false);
    if (!missing.success) expect(missing.code).toBe("COURSE_NOT_FOUND");
  });

  it("deletes a paused course and keeps it out of the public catalogue", async () => {
    const created = await CourseService.createCourse(OWNER, {
      title: "Curso a pausar",
      description: "Descrição",
    });
    const published = await CourseService.updateCourse(OWNER, { id: created.id, status: "published" });
    expect(published.success).toBe(true);
    const paused = await CourseService.updateCourse(OWNER, { id: created.id, status: "paused" });
    expect(paused.success).toBe(true);
    if (paused.success) expect(paused.data.status).toBe("paused");
    expect(isPubliclyVisibleCourseStatus("paused")).toBe(false);

    const { courses } = await CourseService.searchPublishedCourses();
    expect(courses.some((course) => course.id === created.id)).toBe(false);

    const deleted = await CourseService.deleteCourse(OWNER, created.id);
    expect(deleted.success).toBe(true);
  });

  it("rejects direct deletion of a published course using current status", async () => {
    const created = await CourseService.createCourse(OWNER, { title: "Publicado" });
    await CourseService.updateCourse(OWNER, { id: created.id, status: "published" });
    expect(deleteDialogForStatus("published")).toBe("published_block");
    expect(canPermanentlyDeleteCourse("published")).toBe(false);
    expect(canTransitionCourseStatus("published", "paused")).toBe(true);

    const deleted = await CourseService.deleteCourse(OWNER, created.id);
    expect(deleted.success).toBe(false);
    if (!deleted.success) expect(deleted.code).toBe("COURSE_PUBLISHED");

    const stillThere = await CourseService.getOwnedCourse(OWNER, created.id);
    expect(stillThere.success).toBe(true);
    if (stillThere.success) expect(stillThere.data.status).toBe("published");
  });

  it("supports published → paused → delete without auto-deleting after pause", async () => {
    const created = await CourseService.createCourse(OWNER, { title: "Fluxo publicação" });
    await CourseService.updateCourse(OWNER, { id: created.id, status: "published" });
    const paused = await CourseService.updateCourse(OWNER, { id: created.id, status: "paused" });
    expect(paused.success).toBe(true);
    if (paused.success) expect(paused.data.status).toBe("paused");

    const stillPaused = await CourseService.getOwnedCourse(OWNER, created.id);
    expect(stillPaused.success).toBe(true);
    if (stillPaused.success) expect(stillPaused.data.status).toBe("paused");

    const deleted = await CourseService.deleteCourse(OWNER, created.id);
    expect(deleted.success).toBe(true);
  });

  it("keeps the course when deletion is cancelled after pausing", async () => {
    const created = await CourseService.createCourse(OWNER, { title: "Cancelar eliminação" });
    await CourseService.updateCourse(OWNER, { id: created.id, status: "published" });
    await CourseService.updateCourse(OWNER, { id: created.id, status: "paused" });
    const current = await CourseService.getOwnedCourse(OWNER, created.id);
    expect(current.success).toBe(true);
    if (current.success) expect(current.data.status).toBe("paused");
  });

  it("rejects a stale delete request if the current status is published", async () => {
    const created = await CourseService.createCourse(OWNER, { title: "Corrida" });
    await CourseService.updateCourse(OWNER, { id: created.id, status: "published" });
    await CourseService.updateCourse(OWNER, { id: created.id, status: "paused" });
    await CourseService.updateCourse(OWNER, { id: created.id, status: "published" });
    const deleted = await CourseService.deleteCourse(OWNER, created.id);
    expect(deleted.success).toBe(false);
    if (!deleted.success) expect(deleted.code).toBe("COURSE_PUBLISHED");
  });

  it("does not delete YouTube videos when a course is deleted", async () => {
    const chapter = await AcademyAuthoringService.createSection(OWNER, "crs-seed-draft", "Capítulo");
    const lesson = await AcademyAuthoringService.createLesson(OWNER, chapter!.id, "Aula");
    await AcademyAuthoringService.assignLessonYouTubeVideo(OWNER, lesson!.id, "dQw4w9WgXcQ");
    const deleted = await CourseService.deleteCourse(OWNER, "crs-seed-draft");
    expect(deleted.success).toBe(true);
  });

  it("allows archived course deletion as an explicit unpublished lifecycle", () => {
    expect(canPermanentlyDeleteCourse("archived")).toBe(true);
    expect(canPermanentlyDeleteCourse("draft")).toBe(true);
    expect(canPermanentlyDeleteCourse("paused")).toBe(true);
    expect(canPermanentlyDeleteCourse("published")).toBe(false);
    expect(deleteDialogForStatus("archived")).toBe("confirm_delete");
  });
});
