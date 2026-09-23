import { assertYouTubeEmbedUrl, buildYouTubeEmbedUrl } from "@/lib/academy/youtube";
import { lessonHasPlayableVideo } from "@/lib/academy/lesson-video";

export function buildAuthorizedEmbedUrl(youtubeVideoId: string | null | undefined): string | null {
  return assertYouTubeEmbedUrl(buildYouTubeEmbedUrl(youtubeVideoId));
}

export function canAccessLessonVideo(params: {
  courseStatus: string;
  isEnrolled: boolean;
  isOwner: boolean;
}): boolean {
  if (params.isOwner) return true;
  if (params.courseStatus !== "published") return false;
  return params.isEnrolled;
}

export type LessonPlaybackLesson = {
  course_id: string;
  video_source?: "youtube" | "upload" | null;
  youtube_video_id: string | null;
  upload_storage_path?: string | null;
  upload_status?: "uploading" | "ready" | "failed" | null;
  upload_original_mime_type?: string | null;
};

export type LessonPlaybackResult =
  | { allowed: false; reason?: string }
  | { allowed: true; source: "youtube"; embedUrl: string }
  | { allowed: true; source: "upload" };

export function authorizeLessonPlayback(params: {
  profileId: string | null;
  lesson: LessonPlaybackLesson | null;
  course: { id: string; owner_id: string; status: string } | null;
  enrolled: boolean;
}): LessonPlaybackResult {
  if (!params.profileId) return { allowed: false, reason: "auth_required" };
  if (!params.lesson) return { allowed: false, reason: "lesson_not_found" };
  if (!params.course) return { allowed: false, reason: "course_not_found" };

  if (
    !canAccessLessonVideo({
      courseStatus: params.course.status,
      isEnrolled: params.enrolled,
      isOwner: params.course.owner_id === params.profileId,
    })
  ) {
    return { allowed: false, reason: "not_enrolled" };
  }

  if (!lessonHasPlayableVideo(params.lesson)) {
    return { allowed: false, reason: "no_video" };
  }

  const source = params.lesson.video_source ?? "youtube";
  if (source === "upload") {
    return { allowed: true, source: "upload" };
  }

  const embedUrl = buildAuthorizedEmbedUrl(params.lesson.youtube_video_id);
  if (!embedUrl) return { allowed: false, reason: "no_video" };
  return { allowed: true, source: "youtube", embedUrl };
}
