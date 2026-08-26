import type { CourseLessonRecord, CourseWithSections } from "@/types/agriacademy";

export function buildCourseLearnPath(slug: string, lessonId?: string | null): string {
  const base = `/agriacademy/courses/${slug}/learn`;
  if (!lessonId) return base;
  return `${base}?lesson=${encodeURIComponent(lessonId)}`;
}

export function listOrderedLessons(
  course: Pick<CourseWithSections, "sections">
): CourseLessonRecord[] {
  return course.sections
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((section) =>
      (section.lessons || []).slice().sort((a, b) => a.sort_order - b.sort_order)
    );
}

/** Phase 8 will supply persisted progress; until then, use the first lesson. */
export function resolveStartLesson(
  course: Pick<CourseWithSections, "sections">,
  options: { lessonId?: string | null; lastLessonId?: string | null } = {}
): CourseLessonRecord | null {
  const lessons = listOrderedLessons(course);
  if (lessons.length === 0) return null;

  if (options.lessonId) {
    const selected = lessons.find((lesson) => lesson.id === options.lessonId);
    if (selected) return selected;
  }

  if (options.lastLessonId) {
    const resumed = lessons.find((lesson) => lesson.id === options.lastLessonId);
    if (resumed) return resumed;
  }

  return lessons[0];
}
