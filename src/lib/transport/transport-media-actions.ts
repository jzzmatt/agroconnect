"use server";

import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { AuthorizationError } from "@/lib/authorization/server";
import { buildTransportImageStoragePath, buildTransportVideoStoragePath } from "@/lib/media/transport-media-paths";
import { TRANSPORT_MEDIA_BUCKET } from "@/lib/media/supabase-buckets";
import {
  createSignedDisplayUrl,
  createSignedUploadUrl,
  removeStorageObject,
  storageObjectExists,
  uploadBufferToStorage,
} from "@/lib/media/supabase-storage-core";
import { validateProductImage } from "@/lib/products/product-image-validation";
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

  const storagePath = buildTransportVideoStoragePath({
    ownerId: profile.id,
    transportId: params.transportId,
    fileName: params.filename,
  });

  try {
    const signed = await createSignedUploadUrl(TRANSPORT_MEDIA_BUCKET, storagePath);
    return {
      success: true,
      upload: {
        storagePath,
        signedUrl: signed.signedUrl,
        token: signed.token,
        mimeType: params.mimeType,
      },
    };
  } catch {
    return { success: false, code: "TRANSPORT_MEDIA_FAILED" as const };
  }
}

export async function confirmTransportVehicleVideoUploadAction(params: {
  transportId: string;
  storagePath: string;
  fileId?: string;
  url?: string;
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

  const expectedPrefix = `${profile.id}/${params.transportId}/videos/`;
  if (!params.storagePath.startsWith(expectedPrefix)) {
    return { success: false, code: "TRANSPORT_MEDIA_FAILED" as const };
  }
  if (!(await storageObjectExists(TRANSPORT_MEDIA_BUCKET, params.storagePath))) {
    return { success: false, code: "TRANSPORT_MEDIA_FAILED" as const };
  }

  const supabase = await getTransportWritableClient();
  const { data: current } = await (supabase.from("transport_services") as any)
    .select("vehicle_video_storage_path, metadata")
    .eq("id", params.transportId)
    .maybeSingle();

  const priorPath = (current?.vehicle_video_storage_path as string | null) || null;
  const priorMeta = (current?.metadata as Record<string, unknown> | null) || {};

  const { data, error } = await (supabase.from("transport_services") as any)
    .update({
      vehicle_video_url: null,
      vehicle_video_storage_path: params.storagePath,
      metadata: {
        ...priorMeta,
        vehicle_video_thumbnail_url: params.thumbnailUrl || null,
      },
    })
    .eq("id", params.transportId)
    .select("id, vehicle_video_storage_path")
    .maybeSingle();

  if (error || !data) {
    await removeStorageObject(TRANSPORT_MEDIA_BUCKET, params.storagePath);
    return { success: false, code: "TRANSPORT_MEDIA_FAILED" as const };
  }

  if (priorPath && priorPath !== params.storagePath) {
    void removeStorageObject(TRANSPORT_MEDIA_BUCKET, priorPath).catch(() => undefined);
  }

  const { signedUrl } = await createSignedDisplayUrl(TRANSPORT_MEDIA_BUCKET, params.storagePath);
  return { success: true, url: signedUrl };
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

  const storagePath = buildTransportImageStoragePath({
    ownerId: profile.id,
    transportId: params.transportId,
    fileName: params.fileName,
  });

  const supabase = await getTransportWritableClient();
  const { data: current } = await (supabase.from("transport_services") as any)
    .select("vehicle_image_storage_path, metadata")
    .eq("id", params.transportId)
    .maybeSingle();
  const priorPath = (current?.vehicle_image_storage_path as string | null) || null;
  const priorMeta = (current?.metadata as Record<string, unknown> | null) || {};

  try {
    await uploadBufferToStorage({
      bucket: TRANSPORT_MEDIA_BUCKET,
      storagePath,
      buffer: params.buffer,
      contentType: params.mimeType,
    });
  } catch (uploadError) {
    return {
      success: false,
      code: "TRANSPORT_MEDIA_FAILED" as const,
      message: uploadError instanceof Error ? uploadError.message : undefined,
    };
  }

  const { data, error } = await (supabase.from("transport_services") as any)
    .update({
      vehicle_media_url: null,
      vehicle_image_storage_path: storagePath,
      metadata: priorMeta,
    })
    .eq("id", params.transportId)
    .select("id, vehicle_image_storage_path")
    .maybeSingle();

  if (error || !data) {
    await removeStorageObject(TRANSPORT_MEDIA_BUCKET, storagePath);
    return { success: false, code: "TRANSPORT_MEDIA_FAILED" as const };
  }

  if (priorPath && priorPath !== storagePath) {
    void removeStorageObject(TRANSPORT_MEDIA_BUCKET, priorPath).catch(() => undefined);
  }

  const { signedUrl } = await createSignedDisplayUrl(TRANSPORT_MEDIA_BUCKET, storagePath);
  return { success: true, url: signedUrl };
}
