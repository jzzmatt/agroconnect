import type { AuthoringProgress } from "@/lib/academy/authoring-progress";

export function deriveCoursesRequiringAttention<
  T extends { status: string; progress: AuthoringProgress },
>(courses: T[]): T[] {
  return courses.filter(
    (course) =>
      (course.status === "draft" || course.status === "paused") && !course.progress.readyToPublish
  );
}
