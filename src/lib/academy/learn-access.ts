import { isPubliclyVisibleCourseStatus } from "@/lib/academy/course-lifecycle";
import { resolveStartLesson } from "@/lib/academy/course-navigation";
import type { CourseLessonRecord, CourseWithSections } from "@/types/agriacademy";
import type { CourseStatus } from "@/types/database";

export type LearnAccessReason =
  | "not_found"
  | "auth_required"
  | "not_enrolled"
  | "course_unavailable"
  | "no_lessons";

export type LearnAccessResult =
  | {
      allowed: true;
      course: CourseWithSections;
      startLesson: CourseLessonRecord;
      enrolled: true;
    }
  | {
      allowed: false;
      reason: LearnAccessReason;
      course?: CourseWithSections;
    };

/**
 * Decide whether a learner may open the learning UI.
 * Unpublished courses stay hidden unless the viewer is enrolled or the owner.
 */
export function resolveLearnAccess(params: {
  course: CourseWithSections | null;
  profileId: string | null;
  enrolled: boolean;
  isOwner: boolean;
  lessonId?: string | null;
  lastLessonId?: string | null;
}): LearnAccessResult {
  const { course, profileId, enrolled, isOwner, lessonId, lastLessonId } = params;
  if (!course) {
    return { allowed: false, reason: "not_found" };
  }

  const published = isPubliclyVisibleCourseStatus(course.status as CourseStatus);

  if (!profileId) {
    if (!published) return { allowed: false, reason: "not_found" };
    return { allowed: false, reason: "auth_required", course };
  }

  if (!enrolled && !isOwner) {
    if (!published) return { allowed: false, reason: "not_found" };
    return { allowed: false, reason: "not_enrolled", course };
  }

  if (!published && !isOwner) {
    return { allowed: false, reason: "course_unavailable", course };
  }

  const startLesson = resolveStartLesson(course, { lessonId, lastLessonId });
  if (!startLesson) {
    return { allowed: false, reason: "no_lessons", course };
  }

  return {
    allowed: true,
    course,
    startLesson,
    enrolled: true,
  };
}
