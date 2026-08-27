import type { CourseWithSections } from "@/types/agriacademy";
import { formatLessonNumber } from "@/lib/academy/lesson-numbering";
import { validateCourseForPublication } from "@/lib/academy/publication-validation";
import { isYouTubeVideoId } from "@/lib/academy/youtube";

export const AUTHORING_STEP_IDS = [
  "create_course",
  "create_chapters",
  "create_lessons",
  "add_youtube",
  "validate_preview",
  "save_lessons",
  "review_course",
  "publish_course",
] as const;

export type AuthoringStepId = (typeof AUTHORING_STEP_IDS)[number];
export type AuthoringStepState = "completed" | "current" | "pending";

export type AuthoringNextActionKind =
  | "complete_course_info"
  | "create_chapter"
  | "create_lesson"
  | "add_youtube"
  | "save_draft"
  | "review_course"
  | "publish"
  | "none";

export interface MissingYouTubeLesson {
  lessonId: string;
  lessonNumber: string;
  lessonTitle: string;
}

export interface AuthoringStep {
  id: AuthoringStepId;
  state: AuthoringStepState;
}

export interface AuthoringNextAction {
  kind: AuthoringNextActionKind;
  lessonId?: string;
  lessonNumber?: string;
  lessonTitle?: string;
}

export interface AuthoringProgress {
  steps: AuthoringStep[];
  currentStepId: AuthoringStepId | null;
  nextAction: AuthoringNextAction;
  missingYouTubeLessons: MissingYouTubeLesson[];
  readyToPublish: boolean;
  isPublished: boolean;
}

function flattenLessons(course: CourseWithSections): Array<MissingYouTubeLesson & { youtubeVideoId: string | null }> {
  return course.sections.flatMap((section) =>
    (section.lessons || []).map((lesson) => ({
      lessonId: lesson.id,
      lessonNumber: formatLessonNumber(section.sort_order, lesson.sort_order),
      lessonTitle: lesson.title?.trim() || "",
      youtubeVideoId: lesson.youtube_video_id ?? null,
    }))
  );
}

function nextActionForStep(
  stepId: AuthoringStepId | null,
  missingYouTubeLessons: MissingYouTubeLesson[],
  readyToPublish: boolean,
  isPublished: boolean
): AuthoringNextAction {
  if (isPublished) return { kind: "none" };

  switch (stepId) {
    case "create_course":
      return { kind: "complete_course_info" };
    case "create_chapters":
      return { kind: "create_chapter" };
    case "create_lessons":
      return { kind: "create_lesson" };
    case "add_youtube":
    case "validate_preview": {
      const missing = missingYouTubeLessons[0];
      return {
        kind: "add_youtube",
        lessonId: missing?.lessonId,
        lessonNumber: missing?.lessonNumber,
        lessonTitle: missing?.lessonTitle,
      };
    }
    case "save_lessons":
      return { kind: "save_draft" };
    case "review_course":
      return readyToPublish ? { kind: "publish" } : { kind: "review_course" };
    case "publish_course":
      return { kind: "publish" };
    default:
      return readyToPublish ? { kind: "publish" } : { kind: "none" };
  }
}

/**
 * Guided (non-wizard) course workflow. Progress is derived from the course tree
 * plus whether local edits still need a confirmed database save.
 */
export function deriveAuthoringProgress(
  course: CourseWithSections,
  options: { isDirty: boolean } = { isDirty: false }
): AuthoringProgress {
  const hasTitle = Boolean(course.title?.trim());
  const hasChapters = course.sections.length > 0;
  const lessons = flattenLessons(course);
  const hasLessons = lessons.length > 0;
  const missingYouTubeLessons: MissingYouTubeLesson[] = lessons
    .filter((lesson) => !isYouTubeVideoId(lesson.youtubeVideoId))
    .map(({ lessonId, lessonNumber, lessonTitle }) => ({ lessonId, lessonNumber, lessonTitle }));
  const allVideosAssigned = hasLessons && missingYouTubeLessons.length === 0;
  const validation = validateCourseForPublication(course);
  const saved = !options.isDirty;
  const isPublished = course.status === "published";

  const completedById: Record<AuthoringStepId, boolean> = {
    create_course: hasTitle,
    create_chapters: hasChapters,
    create_lessons: hasLessons,
    add_youtube: allVideosAssigned,
    validate_preview: allVideosAssigned,
    save_lessons: saved,
    review_course: validation.ok && saved,
    publish_course: isPublished,
  };

  const currentStepId =
    AUTHORING_STEP_IDS.find((id) => !completedById[id]) ?? null;

  const steps: AuthoringStep[] = AUTHORING_STEP_IDS.map((id) => {
    if (completedById[id]) return { id, state: "completed" };
    if (id === currentStepId) return { id, state: "current" };
    return { id, state: "pending" };
  });

  const readyToPublish =
    validation.ok && saved && (course.status === "draft" || course.status === "paused");

  return {
    steps,
    currentStepId,
    nextAction: nextActionForStep(currentStepId, missingYouTubeLessons, readyToPublish, isPublished),
    missingYouTubeLessons,
    readyToPublish,
    isPublished,
  };
}

export const DASHBOARD_AUTHORING_STEP_IDS = [
  "create_course",
  "create_chapters",
  "create_lessons",
  "add_youtube",
  "review_course",
  "publish_course",
] as const;

/**
 * Compact Course Creator dashboard guide. Progress is reconstructed from
 * persisted course data after reload (no local dirty overlay).
 */
export function deriveDashboardAuthoringProgress(course: CourseWithSections): AuthoringProgress {
  const full = deriveAuthoringProgress(course, { isDirty: false });
  const completed = new Set(full.steps.filter((step) => step.state === "completed").map((step) => step.id));
  const currentStepId = DASHBOARD_AUTHORING_STEP_IDS.find((id) => !completed.has(id)) ?? null;
  const steps: AuthoringStep[] = DASHBOARD_AUTHORING_STEP_IDS.map((id) => ({
    id,
    state: completed.has(id) ? "completed" : id === currentStepId ? "current" : "pending",
  }));

  return {
    ...full,
    steps,
    currentStepId,
    nextAction: nextActionForStep(
      currentStepId,
      full.missingYouTubeLessons,
      full.readyToPublish,
      full.isPublished
    ),
  };
}
