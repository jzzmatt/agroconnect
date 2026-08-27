import type { Dictionary } from "@/i18n";
import type { AuthoringNextAction, AuthoringStepId } from "@/lib/academy/authoring-progress";
import type { ReadinessItemId } from "@/lib/academy/course-readiness";

type AcademyCopy = Dictionary["agriacademy"];

export function authoringStepLabels(dict: AcademyCopy): Record<AuthoringStepId, string> {
  return {
    create_course: dict.authoringStepCreateCourse,
    create_chapters: dict.authoringStepCreateChapters,
    create_lessons: dict.authoringStepCreateLessons,
    add_youtube: dict.authoringStepAddYouTube,
    validate_preview: dict.authoringStepValidatePreview,
    save_lessons: dict.authoringStepSaveLessons,
    review_course: dict.authoringStepReviewCourse,
    publish_course: dict.authoringStepPublishCourse,
  };
}

export function dashboardAuthoringStepLabels(dict: AcademyCopy): Record<AuthoringStepId, string> {
  return {
    ...authoringStepLabels(dict),
    create_course: dict.dashboardStepCourseInfo,
    create_chapters: dict.dashboardStepChapters,
    create_lessons: dict.dashboardStepLessons,
    add_youtube: dict.dashboardStepYouTube,
    review_course: dict.dashboardStepReview,
    publish_course: dict.dashboardStepPublish,
  };
}

export function formatAuthoringNextAction(action: AuthoringNextAction, dict: AcademyCopy): string {
  switch (action.kind) {
    case "complete_course_info":
      return dict.authoringNextCompleteInfo;
    case "create_chapter":
      return dict.authoringNextCreateChapter;
    case "create_lesson":
      return dict.authoringNextCreateLesson;
    case "add_youtube":
      return dict.authoringNextAddYouTube.replace("{lesson}", action.lessonNumber || "");
    case "save_draft":
      return dict.authoringNextSaveDraft;
    case "review_course":
      return dict.authoringNextReview;
    case "publish":
      return dict.authoringNextPublish;
    case "none":
      return dict.authoringNextNone;
  }
}

export function readinessItemLabels(dict: AcademyCopy): Record<ReadinessItemId, string> {
  return {
    course_info: dict.readinessCourseInfo,
    chapters: dict.readinessChapters,
    lessons: dict.readinessLessons,
    youtube: dict.readinessYouTube,
    structure: dict.readinessStructure,
  };
}

export function authoringNextActionLabel(
  action: AuthoringNextAction,
  dict: AcademyCopy,
  publishLabel: string
): string | null {
  switch (action.kind) {
    case "create_chapter":
      return dict.addChapter;
    case "create_lesson":
      return dict.addLesson;
    case "add_youtube":
      return dict.selectVideo;
    case "save_draft":
      return dict.saveDraft;
    case "publish":
      return publishLabel;
    default:
      return null;
  }
}
