import { getBunnyEmbedUrl, getBunnyConfig, fetchBunnyVideoStatus } from "@/lib/video/bunny";
import type { AcademyVideoDescriptor } from "@/types/agriacademy";

export function buildAuthorizedEmbedUrl(
  video: Pick<AcademyVideoDescriptor, "bunny_video_id" | "bunny_library_id" | "status" | "playback_url">
): string | null {
  if (video.playback_url?.includes("iframe.mediadelivery.net")) {
    return video.playback_url;
  }

  const libraryId = video.bunny_library_id || getBunnyConfig().libraryId || null;
  if (!video.bunny_video_id || !libraryId) return null;
  if (video.status !== "ready") return null;
  return getBunnyEmbedUrl(libraryId, video.bunny_video_id);
}

export async function resolvePlaybackEmbedUrl(
  video: Pick<
    AcademyVideoDescriptor,
    "bunny_video_id" | "bunny_library_id" | "status" | "playback_url"
  >
): Promise<string | null> {
  const direct = buildAuthorizedEmbedUrl(video);
  if (direct) return direct;

  if (!video.bunny_video_id || video.status === "ready") return null;

  const remote = await fetchBunnyVideoStatus(video.bunny_video_id);
  if (remote?.status !== "ready") return null;

  const libraryId = video.bunny_library_id || getBunnyConfig().libraryId || null;
  if (!libraryId) return null;
  return getBunnyEmbedUrl(libraryId, video.bunny_video_id);
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
