import { tryGetMediaSupabaseClient } from "@/lib/media/db";
import {
  createServerSupabaseClient,
  tryCreateAdminServerSupabaseClient,
} from "@/lib/supabase/server";
import { EnrollmentService } from "@/lib/services/enrollment-service";
import { authorizeLessonPlayback } from "@/lib/academy/video-playback";
import { createLessonVideoSignedPlaybackUrl } from "@/lib/academy/lesson-video-storage";

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
  }): Promise<{
    allowed: boolean;
    source?: "youtube" | "upload";
    embedUrl?: string;
    playbackUrl?: string;
    mimeType?: string;
    expiresAt?: string;
    reason?: string;
  }> {
    if (!hasLiveSupabase()) {
      return { allowed: false, reason: "unavailable" };
    }

    const supabase = await getPlaybackSupabase();

    const { data: lesson } = await (supabase.from("course_lessons") as any)
      .select(
        "id, course_id, youtube_video_id, is_free_preview, video_source, upload_storage_path, upload_status, upload_original_mime_type"
      )
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

    const auth = authorizeLessonPlayback({
      profileId: params.profileId,
      lesson,
      course,
      enrolled: isEnrolled,
    });

    if (!auth.allowed) {
      return { allowed: false, reason: auth.reason };
    }

    if (auth.source === "youtube" && "embedUrl" in auth) {
      return { allowed: true, source: "youtube", embedUrl: auth.embedUrl };
    }

    if (
      auth.source === "upload" &&
      lesson.video_source === "upload" &&
      lesson.upload_storage_path &&
      lesson.upload_status === "ready"
    ) {
      try {
        const signed = await createLessonVideoSignedPlaybackUrl(String(lesson.upload_storage_path));
        return {
          allowed: true,
          source: "upload",
          playbackUrl: signed.signedUrl,
          mimeType: String(lesson.upload_original_mime_type || "video/mp4"),
          expiresAt: signed.expiresAt,
        };
      } catch {
        return { allowed: false, reason: "playback_unavailable" };
      }
    }

    return { allowed: false, reason: "no_video" };
  }

  public static async getEnrollmentStatus(
    profileId: string,
    courseId: string
  ): Promise<{ enrolled: boolean }> {
    const enrolled = await EnrollmentService.isEnrolled(profileId, courseId);
    return { enrolled };
  }
}
