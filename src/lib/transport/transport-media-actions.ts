"use server";

import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { AuthorizationError } from "@/lib/authorization/server";
import {
  createImageKitUploadAuth,
  transportMediaFolder,
  uploadBufferToImageKit,
} from "@/lib/media/imagekit";
import { validateProductImage } from "@/lib/services/product-media-service";
import { getTransportWritableClient } from "@/lib/transport/supabase-client";
import { requireTransportOwnership } from "@/lib/transport/ownership";
import { validateTransportVideo } from "@/lib/transport/video-validation";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function createTransportVehicleVideoUploadAction(params: {
  transportId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  durationSeconds: number;
}) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile || !isUuid(profile.id) || !isUuid(params.transportId)) {
    return { success: false, code: "AUTH_REQUIRED" as const };
  }

  const entitlements = getUserEntitlements({
    subscriptionPlan: profile.subscription_plan,
    roles: profile.roles,
    accountType: profile.account_type,
  });
  if (!entitlements.can_manage_services) {
    return { success: false, code: "FEATURE_NOT_AVAILABLE" as const };
  }

  try {
    await requireTransportOwnership(params.transportId, profile);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, code: error.code };
    }
    throw error;
  }

  const validation = validateTransportVideo({
    mimeType: params.mimeType,
    fileSize: params.fileSize,
    durationSeconds: params.durationSeconds,
    fileName: params.filename,
  });
  if (!validation.ok) {
    return { success: false, code: validation.code, message: validation.error };
  }

  const upload = createImageKitUploadAuth({
    folder: transportMediaFolder(params.transportId, "videos"),
  });
  if (!upload.configured) {
    return { success: false, code: upload.code || "IMAGEKIT_NOT_CONFIGURED", message: upload.error };
  }

  return { success: true, upload };
}

export async function confirmTransportVehicleVideoUploadAction(params: {
  transportId: string;
  fileId: string;
  url: string;
  thumbnailUrl?: string | null;
}) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile || !isUuid(profile.id) || !isUuid(params.transportId)) {
    return { success: false, code: "AUTH_REQUIRED" as const };
  }

  try {
    await requireTransportOwnership(params.transportId, profile);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, code: error.code };
    }
    throw error;
  }

  const supabase = await getTransportWritableClient();
  const { data, error } = await (supabase.from("transport_services") as any)
    .update({
      vehicle_video_url: params.url,
      metadata: {
        vehicle_video_file_id: params.fileId,
        vehicle_video_thumbnail_url: params.thumbnailUrl || null,
      },
    })
    .eq("id", params.transportId)
    .select("id, vehicle_video_url")
    .maybeSingle();

  if (error || !data) {
    return { success: false, code: "TRANSPORT_MEDIA_FAILED" as const };
  }

  return { success: true, url: data.vehicle_video_url as string };
}

export async function uploadTransportVehicleImageAction(params: {
  transportId: string;
  buffer: Buffer;
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  fileSize: number;
}) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile || !isUuid(profile.id) || !isUuid(params.transportId)) {
    return { success: false, code: "AUTH_REQUIRED" as const };
  }

  const entitlements = getUserEntitlements({
    subscriptionPlan: profile.subscription_plan,
    roles: profile.roles,
    accountType: profile.account_type,
  });
  if (!entitlements.can_manage_services) {
    return { success: false, code: "FEATURE_NOT_AVAILABLE" as const };
  }

  try {
    await requireTransportOwnership(params.transportId, profile);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { success: false, code: error.code };
    }
    throw error;
  }

  const validation = validateProductImage({
    mimeType: params.mimeType,
    fileSize: params.fileSize,
    fileName: params.fileName,
  });
  if (!validation.ok) {
    return { success: false, code: "TRANSPORT_IMAGE_INVALID" as const, message: validation.error };
  }

  const uploaded = await uploadBufferToImageKit({
    buffer: params.buffer,
    fileName: params.fileName,
    folder: transportMediaFolder(params.transportId, "images"),
  });
  if (!uploaded.configured || !uploaded.url) {
    return {
      success: false,
      code: uploaded.code || "IMAGEKIT_UPLOAD_FAILED",
      message: uploaded.error,
    };
  }

  const supabase = await getTransportWritableClient();
  const { data, error } = await (supabase.from("transport_services") as any)
    .update({
      vehicle_media_url: uploaded.url,
      metadata: {
        vehicle_image_file_id: uploaded.fileId,
      },
    })
    .eq("id", params.transportId)
    .select("id, vehicle_media_url")
    .maybeSingle();

  if (error || !data) {
    return { success: false, code: "TRANSPORT_MEDIA_FAILED" as const };
  }

  return { success: true, url: data.vehicle_media_url as string };
}
