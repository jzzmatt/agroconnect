import { tryGetMediaSupabaseClient } from "@/lib/media/db";
import {
  createServerSupabaseClient,
  tryCreateAdminServerSupabaseClient,
} from "@/lib/supabase/server";
import { EnrollmentService } from "@/lib/services/enrollment-service";
import {
  buildAuthorizedEmbedUrl,
  canAccessLessonVideo,
  resolvePlaybackEmbedUrl,
} from "@/lib/academy/video-playback";
import type { AcademyVideoDescriptor } from "@/types/agriacademy";

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
      .select("id, course_id, academy_video_id, is_free_preview")
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

    const isOwner = course.owner_id === params.profileId;
    const isEnrolled = await EnrollmentService.isEnrolled(params.profileId, course.id);

    if (
      !canAccessLessonVideo({
        courseStatus: course.status,
        isEnrolled,
        isOwner,
        isFreePreview: lesson.is_free_preview,
      })
    ) {
      return { allowed: false, reason: "not_enrolled" };
    }

    if (!lesson.academy_video_id) {
      return { allowed: false, reason: "no_video" };
    }

    const { data: video } = await (supabase.from("academy_videos") as any)
      .select("*")
      .eq("id", lesson.academy_video_id)
      .maybeSingle();

    const asset = video as AcademyVideoDescriptor | null;
    if (!asset) {
      return { allowed: false, reason: "video_not_found" };
    }

    const embedUrl = await resolvePlaybackEmbedUrl(asset);
    if (!embedUrl) {
      return { allowed: false, reason: "video_not_ready" };
    }

    return { allowed: true, embedUrl };
  }

  public static async getEnrollmentStatus(
    profileId: string,
    courseId: string
  ): Promise<{ enrolled: boolean }> {
    const enrolled = await EnrollmentService.isEnrolled(profileId, courseId);
    return { enrolled };
  }
}
