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
  };
}

export async function createAcademyVideoUploadAction(params: {
  title: string;
  filename: string;
  mimeType: string;
  fileSize: number;
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
  });
}

export async function deleteAcademyVideoAction(videoId: string) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) return { ok: false, reason: "not_found" };
  return AcademyVideoService.deleteVideo(videoId, profile.id);
}

export async function getAcademyVideoPreviewAction(videoId: string) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return { allowed: false as const, code: "AUTH_REQUIRED" as const };
  }

  const preview = await AcademyVideoService.resolveOwnerPreview(videoId, profile.id);
  if (!preview) {
    return { allowed: false as const, code: "NOT_FOUND" as const };
  }

  return {
    allowed: true as const,
    embedUrl: preview.embedUrl,
    ready: preview.ready,
    status: preview.status,
  };
}

export async function uploadAcademyVideoBinaryAction(params: {
  videoId: string;
  body: ArrayBuffer;
  contentType: string;
  contentLength: number;
}) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return { success: false as const, code: "AUTH_REQUIRED" as const };
  }

  const video = await AcademyVideoService.uploadBinaryForOwner({
    videoId: params.videoId,
    ownerId: profile.id,
    body: params.body,
    contentType: params.contentType,
    contentLength: params.contentLength,
  });

  if (!video) {
    return {
      success: false as const,
      code: "BUNNY_UPLOAD_FAILED" as const,
      message: "O Bunny Stream não confirmou o recebimento do ficheiro de vídeo.",
    };
  }

  return { success: true as const, video };
}

export async function confirmAcademyVideoUploadAction(videoId: string) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return { success: false as const, code: "AUTH_REQUIRED" as const };
  }

  const video = await AcademyVideoService.syncStatusAfterUpload(videoId, profile.id);
  if (!video) {
    return {
      success: false as const,
      code: "BUNNY_UPLOAD_FAILED" as const,
      message: "O Bunny Stream não confirmou o recebimento do ficheiro de vídeo.",
    };
  }

  return { success: true as const, video };
}

export async function getAcademyVideoUploadStatusAction(videoId: string) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false as const, code: "AUTH_REQUIRED" as const };
  }

  const status = await AcademyVideoService.syncUploadProgressFromBunny(videoId, profile.id);
  if (!status) {
    return { ok: false as const, code: "NOT_FOUND" as const };
  }

  return { ok: true as const, ...status };
}
