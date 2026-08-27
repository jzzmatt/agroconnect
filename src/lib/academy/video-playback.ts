import { assertYouTubeEmbedUrl, buildYouTubeEmbedUrl } from "@/lib/academy/youtube";

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

export function authorizeLessonPlayback(params: {
  profileId: string | null;
  lesson: { course_id: string; youtube_video_id: string | null } | null;
  course: { id: string; owner_id: string; status: string } | null;
  enrolled: boolean;
}): { allowed: boolean; embedUrl?: string; reason?: string } {
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

  const embedUrl = buildAuthorizedEmbedUrl(params.lesson.youtube_video_id);
  if (!embedUrl) return { allowed: false, reason: "no_video" };
  return { allowed: true, embedUrl };
}
