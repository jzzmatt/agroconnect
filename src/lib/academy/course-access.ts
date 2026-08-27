import { tryGetMediaSupabaseClient } from "@/lib/media/db";
import {
  createServerSupabaseClient,
  tryCreateAdminServerSupabaseClient,
} from "@/lib/supabase/server";
import { EnrollmentService } from "@/lib/services/enrollment-service";
import { authorizeLessonPlayback } from "@/lib/academy/video-playback";

function hasLiveSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

/** Privileged reads for server-side authorization; enrollment is enforced in app code. */
async function getPlaybackSupabase() {
  return (
    tryGetMediaSupabaseClient() ||
    tryCreateAdminServerSupabaseClient() ||
    (await createServerSupabaseClient())
  );
}

export class CourseAccessService {
  public static async getLessonPlayback(params: {
    lessonId: string;
    profileId: string;
  }): Promise<{ allowed: boolean; embedUrl?: string; reason?: string }> {
    if (!hasLiveSupabase()) {
      return { allowed: false, reason: "unavailable" };
    }

    const supabase = await getPlaybackSupabase();

    const { data: lesson } = await (supabase.from("course_lessons") as any)
      .select("id, course_id, youtube_video_id, is_free_preview")
      .eq("id", params.lessonId)
      .maybeSingle();

    if (!lesson?.course_id) {
      return { allowed: false, reason: "lesson_not_found" };
    }

    const { data: course } = await (supabase.from("courses") as any)
      .select("id, owner_id, status")
      .eq("id", lesson.course_id)
      .maybeSingle();

    if (!course) {
      return { allowed: false, reason: "course_not_found" };
    }

    const isEnrolled = await EnrollmentService.isEnrolled(params.profileId, course.id);

    return authorizeLessonPlayback({
      profileId: params.profileId,
      lesson,
      course,
      enrolled: isEnrolled,
    });
  }

  public static async getEnrollmentStatus(
    profileId: string,
    courseId: string
  ): Promise<{ enrolled: boolean }> {
    const enrolled = await EnrollmentService.isEnrolled(profileId, courseId);
    return { enrolled };
  }
}
