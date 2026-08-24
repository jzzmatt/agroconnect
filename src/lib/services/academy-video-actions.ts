"use server";

import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements, formatVideoStorage } from "@/lib/services/pricing-service";
import { AcademyVideoService } from "@/lib/services/academy-video-service";

export async function getAcademyStorageAction() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return {
      usedBytes: 0,
      limitBytes: 0,
      usedLabel: "0 GB",
      limitLabel: "0 GB",
      percent: 0,
      videos: [],
    };
  }
  const entitlements = getUserEntitlements({ subscriptionPlan: profile.subscription_plan });
  const usedBytes = profile.video_storage_used_bytes || (await AcademyVideoService.getUsageBytes(profile.id));
  const limitBytes = entitlements.video_storage_limit_bytes;
  return {
    usedBytes,
    limitBytes,
    usedLabel: formatVideoStorage(usedBytes),
    limitLabel: formatVideoStorage(limitBytes),
    percent: limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0,
    videos: await AcademyVideoService.listByOwner(profile.id),
  };
}

export async function createAcademyVideoUploadAction(params: {
  title: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  courseId?: string;
}) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error("Não autorizado.");

  const entitlements = getUserEntitlements({ subscriptionPlan: profile.subscription_plan });
  if (!entitlements.can_create_courses) {
    throw new Error("A criação de vídeos AgriAcademy está disponível a partir do plano Profissional.");
  }

  return AcademyVideoService.createUpload({
    ownerId: profile.id,
    plan: profile.subscription_plan ?? null,
    title: params.title,
    filename: params.filename,
    mimeType: params.mimeType,
    fileSize: params.fileSize,
    courseId: params.courseId,
  });
}

export async function deleteAcademyVideoAction(videoId: string) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) return false;
  return AcademyVideoService.deleteVideo(videoId, profile.id);
}
