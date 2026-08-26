import type { BunnyLibraryVideoSummary } from "@/lib/video/bunny";
import type { AcademyVideoDescriptor } from "@/types/agriacademy";

export type LibraryReconcileAction = "keep" | "remove" | "mark_failed" | "sync";

export function planLibraryReconcile(params: {
  video: AcademyVideoDescriptor;
  remote: BunnyLibraryVideoSummary | null;
}): { action: LibraryReconcileAction; nextStatus?: AcademyVideoDescriptor["status"] } {
  const bunnyId = params.video.bunny_video_id;
  if (!bunnyId) {
    return { action: "keep" };
  }

  if (!params.remote) {
    const refCount = params.video.reference_count ?? 0;
    if (refCount === 0) {
      return { action: "remove" };
    }
    return { action: "mark_failed", nextStatus: "failed" };
  }

  const needsSync =
    params.remote.status !== params.video.status ||
    (params.remote.status === "ready" && !params.video.playback_url) ||
    (params.remote.thumbnailUrl && !params.video.thumbnail_url) ||
    (params.remote.durationSeconds && !params.video.duration_seconds);

  if (needsSync) {
    return { action: "sync", nextStatus: params.remote.status };
  }

  return { action: "keep" };
}

export function isSelectableLibraryVideo(video: AcademyVideoDescriptor): boolean {
  return video.status !== "deleted" && video.status !== "failed";
}
