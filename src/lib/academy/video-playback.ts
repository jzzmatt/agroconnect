import { getBunnyEmbedUrl } from "@/lib/video/bunny";
import type { AcademyVideoDescriptor } from "@/types/agriacademy";

export function buildAuthorizedEmbedUrl(video: Pick<AcademyVideoDescriptor, "bunny_video_id" | "bunny_library_id" | "status">): string | null {
  if (video.status !== "ready") return null;
  if (!video.bunny_video_id || !video.bunny_library_id) return null;
  return getBunnyEmbedUrl(video.bunny_library_id, video.bunny_video_id);
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
