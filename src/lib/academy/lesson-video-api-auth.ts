import "server-only";

import { authorize } from "@/lib/authorization/server";
import { getCurrentUserProfile } from "@/lib/clerk/auth";

export async function requireLessonVideoEditor() {
  await authorize("academy.course.update");
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false as const, status: 401, error: "AUTH_REQUIRED" };
  }
  return { ok: true as const, profile };
}
