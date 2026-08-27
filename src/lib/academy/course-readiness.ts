import type { CourseWithSections } from "@/types/agriacademy";
import { validateCourseForPublication } from "@/lib/academy/publication-validation";
import { isYouTubeVideoId } from "@/lib/academy/youtube";

export const READINESS_ITEM_IDS = [
  "course_info",
  "chapters",
  "lessons",
  "youtube",
  "structure",
] as const;

export type ReadinessItemId = (typeof READINESS_ITEM_IDS)[number];

export interface ReadinessItem {
  id: ReadinessItemId;
  complete: boolean;
}

export interface ReadinessChecklist {
  items: ReadinessItem[];
  ready: boolean;
}

export function deriveReadinessChecklist(course: CourseWithSections): ReadinessChecklist {
  const hasInfo = Boolean(course.title?.trim()) && Boolean(course.description?.trim() || course.short_description?.trim());
  const hasChapters = course.sections.length > 0;
  const lessons = course.sections.flatMap((section) => section.lessons || []);
  const hasLessons = lessons.length > 0;
  const hasYouTube = hasLessons && lessons.every((lesson) => isYouTubeVideoId(lesson.youtube_video_id));
  const hasStructure =
    hasChapters && course.sections.every((section) => (section.lessons || []).length > 0);
  const validation = validateCourseForPublication(course);

  const items: ReadinessItem[] = [
    { id: "course_info", complete: hasInfo },
    { id: "chapters", complete: hasChapters },
    { id: "lessons", complete: hasLessons },
    { id: "youtube", complete: hasYouTube },
    { id: "structure", complete: hasStructure },
  ];

  return {
    items,
    ready: validation.ok && items.every((item) => item.complete),
  };
}
