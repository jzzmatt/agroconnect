import type { CourseStatus } from "@/types/database";

export type CourseDeleteDialogKind = "confirm_delete" | "published_block" | "confirm_after_pause";

/**
 * Archived courses may be permanently deleted: they are already off the public
 * catalogue and have no resume/publish transition. Draft and paused courses
 * may also be deleted. Published courses must be paused first.
 */
export function canPermanentlyDeleteCourse(status: CourseStatus): boolean {
  return status === "draft" || status === "paused" || status === "archived";
}

export function deleteDialogForStatus(status: CourseStatus): CourseDeleteDialogKind {
  if (status === "published") return "published_block";
  return "confirm_delete";
}
