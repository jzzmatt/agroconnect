import { VIDEO_STORAGE_QUOTA_BYTES, getUserEntitlements } from "@/lib/services/pricing-service";
import { createBunnyVideo, deleteBunnyVideo, isBunnyConfigured } from "@/lib/video/bunny";
import type { SubscriptionPlan, AcademyVideoStatus } from "@/types/database";
import type { AcademyVideoDescriptor, AcademyVideoVisibility } from "@/types/agriacademy";

export type AcademyVideoRecord = AcademyVideoDescriptor;

const videos: AcademyVideoRecord[] = [];
const usageByOwner = new Map<string, number>();

export class AcademyVideoService {
  public static getUsageBytes(ownerId: string): number {
    return usageByOwner.get(ownerId) || videos.filter((v) => v.owner_id === ownerId && v.status !== "deleted").reduce((sum, v) => sum + v.file_size, 0);
  }

  public static getQuota(plan: SubscriptionPlan | string | null): number {
    const entitlements = getUserEntitlements({ subscriptionPlan: plan });
    return entitlements.video_storage_limit_bytes;
  }

  public static canAcceptUpload(params: {
    ownerId: string;
    plan: SubscriptionPlan | string | null;
    incomingBytes: number;
  }): { ok: true } | { ok: false; error: string } {
    const quota = this.getQuota(params.plan);
    if (quota <= 0) {
      return { ok: false, error: "O plano Básico não inclui armazenamento de vídeo AgriAcademy." };
    }
    const used = this.getUsageBytes(params.ownerId);
    if (used + params.incomingBytes > quota) {
      return { ok: false, error: "Limite de armazenamento atingido." };
    }
    return { ok: true };
  }

  public static listByOwner(ownerId: string): AcademyVideoRecord[] {
    return videos.filter((v) => v.owner_id === ownerId && v.status !== "deleted");
  }

  public static async createUpload(params: {
    ownerId: string;
    plan: SubscriptionPlan | string | null;
    title: string;
    filename: string;
    mimeType: string;
    fileSize: number;
    courseId?: string;
  }): Promise<{ video: AcademyVideoRecord; upload: Awaited<ReturnType<typeof createBunnyVideo>> }> {
    const allowed = this.canAcceptUpload({
      ownerId: params.ownerId,
      plan: params.plan,
      incomingBytes: params.fileSize,
    });
    if (!allowed.ok) {
      throw new Error(allowed.error);
    }

    const bunny = await createBunnyVideo({ title: params.title });
    const record: AcademyVideoRecord = {
      id: `avid-${Math.random().toString(36).slice(2, 10)}`,
      owner_id: params.ownerId,
      course_id: params.courseId || null,
      bunny_video_id: bunny.bunnyVideoId,
      bunny_library_id: bunny.bunnyLibraryId,
      title: params.title,
      filename: params.filename,
      mime_type: params.mimeType,
      file_size: params.fileSize,
      status: bunny.configured ? "uploading" : "pending",
      visibility: "enrolled_only",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    videos.push(record);
    usageByOwner.set(params.ownerId, (usageByOwner.get(params.ownerId) || 0) + params.fileSize);
    return { video: record, upload: bunny };
  }

  public static markStatus(videoId: string, status: AcademyVideoRecord["status"], extras?: Partial<AcademyVideoRecord>) {
    const video = videos.find((v) => v.id === videoId || v.bunny_video_id === videoId);
    if (!video) return null;
    video.status = status;
    video.updated_at = new Date().toISOString();
    Object.assign(video, extras || {});
    return video;
  }

  public static async deleteVideo(videoId: string, ownerId: string): Promise<boolean> {
    const video = videos.find((v) => v.id === videoId && v.owner_id === ownerId);
    if (!video) return false;
    if (video.bunny_video_id) {
      await deleteBunnyVideo(video.bunny_video_id);
    }
    video.status = "deleted";
    video.updated_at = new Date().toISOString();
    usageByOwner.set(ownerId, Math.max(0, this.getUsageBytes(ownerId) - video.file_size));
    return true;
  }

  public static reconcile(params: { bunnyVideoId?: string | null; hasBunny: boolean; hasRecord: boolean }): "ok" | "orphan_bunny" | "video_unavailable" {
    if (params.hasBunny && !params.hasRecord) return "orphan_bunny";
    if (params.hasRecord && params.bunnyVideoId && !params.hasBunny) return "video_unavailable";
    return "ok";
  }

  public static isInfrastructureReady() {
    return isBunnyConfigured();
  }
}
