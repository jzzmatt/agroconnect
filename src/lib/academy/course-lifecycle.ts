import type { CourseStatus } from "@/types/database";

/** Allowed publication lifecycle transitions for AgriAcademy courses. */
export const COURSE_STATUS_TRANSITIONS: Record<CourseStatus, readonly CourseStatus[]> = {
  draft: ["published", "archived"],
  published: ["paused", "archived"],
  paused: ["published", "archived"],
  archived: [],
};

export function isPubliclyVisibleCourseStatus(status: CourseStatus): boolean {
  return status === "published";
}

export function canTransitionCourseStatus(from: CourseStatus, to: CourseStatus): boolean {
  if (from === to) return true;
  return COURSE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertCourseStatusTransition(from: CourseStatus, to: CourseStatus): void {
  if (!canTransitionCourseStatus(from, to)) {
    throw new Error(`Transição de estado inválida: ${from} → ${to}`);
  }
}
