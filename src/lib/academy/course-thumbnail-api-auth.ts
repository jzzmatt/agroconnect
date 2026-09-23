import "server-only";

import { authorize } from "@/lib/authorization/server";
import { getCurrentUserProfile } from "@/lib/clerk/auth";
import { CourseService } from "@/lib/services/course-service";

export async function requireCourseThumbnailEditor(courseId: string) {
  await authorize("academy.course.update");
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false as const, status: 401, error: "AUTH_REQUIRED" };
  }

  const owned = await CourseService.getOwnedCourse(profile.id, courseId);
  if (!owned.success) {
    return { ok: false as const, status: 403, error: owned.code };
  }

  return { ok: true as const, profile, course: owned.data };
}
