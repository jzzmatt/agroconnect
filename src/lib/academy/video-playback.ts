import { buildYouTubeEmbedUrl } from "@/lib/academy/youtube";

export function buildAuthorizedEmbedUrl(youtubeVideoId: string | null | undefined): string | null {
  return buildYouTubeEmbedUrl(youtubeVideoId);
}

export function canAccessLessonVideo(params: {
  courseStatus: string;
  isEnrolled: boolean;
  isOwner: boolean;
  isFreePreview?: boolean;
}): boolean {
  if (params.isOwner) return true;
  if (params.courseStatus !== "published") return false;
  if (params.isFreePreview) return true;
  return params.isEnrolled;
}
