import "server-only";

import { randomUUID } from "node:crypto";
import { getMediaSupabaseClient } from "@/lib/media/db";
import { SUPABASE_STORAGE_PROVIDER } from "@/lib/media/supabase-buckets";
import {
  createSignedDisplayUrl,
  downloadStorageObject,
  removeStorageObject,
  uploadBufferToStorage,
} from "@/lib/media/supabase-storage-core";
import { validateProductImage } from "@/lib/products/product-image-validation";
import { planTempVideoUpload } from "@/lib/products/temp-video-chunks";
import {
  SERVICE_IMAGE_LIMIT,
  SERVICE_MEDIA_BUCKET,
  assertServiceVideo,
  serviceImagePath,
  serviceMediaChunkPath,
  serviceVideoObjectPath,
  serviceVideoPath,
} from "@/lib/services/service-media";

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

type Db = { from: (table: string) => any };

function database(): Db {
  return getMediaSupabaseClient() as unknown as Db;
}

async function ownedService(db: Db, profileId: string, serviceId: string) {
  const { data, error } = await db
    .from("services")
    .select("id,provider_id,title,status")
    .eq("id", serviceId)
    .maybeSingle();
  if (error) fail("STORAGE_UNAVAILABLE");
  if (!data) return null;
  const { data: provider } = await db
    .from("provider_profiles")
    .select("profile_id")
    .eq("id", data.provider_id)
    .maybeSingle();
  if (!provider?.profile_id || String(provider.profile_id) !== profileId) return null;
  return data as { id: string; title: string; status: string; provider_id: string };
}

async function serviceAccess(db: Db, serviceId: string) {
  const { data, error } = await db
    .from("services")
    .select("id,provider_id,status")
    .eq("id", serviceId)
    .maybeSingle();
  if (error) fail("STORAGE_UNAVAILABLE");
  if (!data) return null;
  const { data: provider } = await db
    .from("provider_profiles")
    .select("profile_id")
    .eq("id", data.provider_id)
    .maybeSingle();
  if (!provider?.profile_id) return null;
  return { ownerProfileId: String(provider.profile_id), status: String(data.status) };
}

function isPublic(status: string) {
  return status === "published" || status === "active";
}

export async function listServiceMedia(serviceId: string, viewerProfileId: string | null) {
  const db = database();
  const access = await serviceAccess(db, serviceId);
  if (!access) return null;
  if (!isPublic(access.status) && access.ownerProfileId !== viewerProfileId) return null;
  const { data: images } = await db
    .from("service_images")
    .select("id,alt_text,is_primary,sort_order")
    .eq("service_id", serviceId)
    .order("sort_order", { ascending: true });
  const { data: video } = await db
    .from("service_videos")
    .select("id,duration_seconds,file_size,mime_type")
    .eq("service_id", serviceId)
    .eq("status", "ready")
    .maybeSingle();
  return {
    images: (images || []).map((row: { id: string; alt_text: string | null; is_primary: boolean }) => ({
      id: String(row.id),
      url: serviceImagePath(serviceId, String(row.id)),
      alt_text: row.alt_text || "",
      is_primary: Boolean(row.is_primary),
    })),
    video: video
      ? {
          id: String(video.id),
          url: serviceVideoPath(serviceId),
          durationSeconds: Number(video.duration_seconds),
          fileSize: Number(video.file_size),
        }
      : null,
  };
}

export async function addServiceImage(params: {
  profileId: string;
  serviceId: string;
  bytes: Buffer;
  fileName: string;
  mimeType: string;
}) {
  const db = database();
  const service = await ownedService(db, params.profileId, params.serviceId);
  if (!service) fail("NOT_FOUND");
  const mime = params.mimeType.split(";")[0].trim().toLowerCase();
  const validation = validateProductImage({
    mimeType: mime,
    fileSize: params.bytes.length,
    fileName: params.fileName,
  });
  if (!validation.ok) fail("PRODUCT_IMAGE_INVALID");
  const counted = await db
    .from("service_images")
    .select("id", { count: "exact", head: true })
    .eq("service_id", params.serviceId);
  if (counted.error) fail("STORAGE_UNAVAILABLE");
  const total = Number(counted.count || 0);
  if (total >= SERVICE_IMAGE_LIMIT) fail("PRODUCT_IMAGE_INVALID");
  const imageId = randomUUID();
  const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const storagePath = `${params.profileId}/${params.serviceId}/images/${imageId}.${extension}`;
  await uploadBufferToStorage({
    bucket: SERVICE_MEDIA_BUCKET,
    storagePath,
    buffer: params.bytes,
    contentType: mime,
  });
  const isPrimary = total === 0;
  const { error } = await db.from("service_images").insert({
    id: imageId,
    service_id: params.serviceId,
    owner_id: params.profileId,
    storage_provider: SUPABASE_STORAGE_PROVIDER,
    storage_path: storagePath,
    alt_text: service.title,
    mime_type: mime,
    file_size: params.bytes.length,
    sort_order: total,
    is_primary: isPrimary,
  });
  if (error) {
    await removeStorageObject(SERVICE_MEDIA_BUCKET, storagePath);
    fail("PRODUCT_IMAGE_INVALID");
  }
  return { id: imageId, url: serviceImagePath(params.serviceId, imageId), is_primary: isPrimary };
}

export async function removeServiceImage(profileId: string, serviceId: string, imageId: string) {
  const db = database();
  const service = await ownedService(db, profileId, serviceId);
  if (!service) fail("NOT_FOUND");
  const { data } = await db
    .from("service_images")
    .select("id,storage_path,is_primary")
    .eq("id", imageId)
    .eq("service_id", serviceId)
    .eq("owner_id", profileId)
    .maybeSingle();
  if (!data) fail("NOT_FOUND");
  await db.from("service_images").delete().eq("id", imageId);
  await removeStorageObject(SERVICE_MEDIA_BUCKET, data.storage_path);
  if (data.is_primary) {
    const { data: next } = await db
      .from("service_images")
      .select("id")
      .eq("service_id", serviceId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next?.id) await db.from("service_images").update({ is_primary: true }).eq("id", next.id);
  }
}

export async function makeServiceImagePrimary(profileId: string, serviceId: string, imageId: string) {
  const db = database();
  const service = await ownedService(db, profileId, serviceId);
  if (!service) fail("NOT_FOUND");
  const { data } = await db
    .from("service_images")
    .select("id")
    .eq("id", imageId)
    .eq("service_id", serviceId)
    .eq("owner_id", profileId)
    .maybeSingle();
  if (!data) fail("NOT_FOUND");
  await db.from("service_images").update({ is_primary: false }).eq("service_id", serviceId);
  await db.from("service_images").update({ is_primary: true }).eq("id", imageId);
}

export async function storeServiceVideoChunk(params: {
  profileId: string;
  serviceId: string;
  requestId: string;
  index: number;
  total: number;
  fileSize: number;
  mimeType: string;
  bytes: Buffer;
}) {
  const db = database();
  const service = await ownedService(db, params.profileId, params.serviceId);
  if (!service) fail("NOT_FOUND");
  const plan = planTempVideoUpload(params.fileSize);
  if (params.total !== plan.total || params.index < 0 || params.index >= plan.total) fail("INVALID_REQUEST");
  if (params.bytes.length <= 0) fail("PRODUCT_VIDEO_TOO_LARGE");
  const contentType = params.mimeType === "video/mp4" ? "video/mp4" : "video/webm";
  await uploadBufferToStorage({
    bucket: SERVICE_MEDIA_BUCKET,
    storagePath: serviceMediaChunkPath(params.profileId, params.serviceId, params.requestId, params.index),
    buffer: params.bytes,
    contentType,
  });
}

export async function completeServiceVideo(params: {
  profileId: string;
  serviceId: string;
  requestId: string;
  total: number;
  fileSize: number;
  mimeType: string;
  durationSeconds: number;
  fileName?: string;
}) {
  const db = database();
  const service = await ownedService(db, params.profileId, params.serviceId);
  if (!service) fail("NOT_FOUND");
  const checked = assertServiceVideo(params);
  const plan = planTempVideoUpload(params.fileSize);
  if (params.total !== plan.total) fail("INVALID_REQUEST");
  const parts: Buffer[] = [];
  for (let index = 0; index < params.total; index += 1) {
    const path = serviceMediaChunkPath(params.profileId, params.serviceId, params.requestId, index);
    const part = await downloadStorageObject(SERVICE_MEDIA_BUCKET, path);
    if (!part) fail("CHUNK_MISSING");
    parts.push(part);
  }
  const bytes = Buffer.concat(parts);
  if (bytes.length !== params.fileSize) fail("CHUNK_MISSING");
  const storagePath = serviceVideoObjectPath(params.profileId, params.serviceId, checked.mimeType);
  await uploadBufferToStorage({
    bucket: SERVICE_MEDIA_BUCKET,
    storagePath,
    buffer: bytes,
    contentType: checked.mimeType,
  });
  const { data: previous } = await db
    .from("service_videos")
    .select("id,storage_path")
    .eq("service_id", params.serviceId)
    .eq("status", "ready");
  for (const row of previous || []) {
    if (row.storage_path && row.storage_path !== storagePath) {
      await removeStorageObject(SERVICE_MEDIA_BUCKET, row.storage_path);
    }
    await db.from("service_videos").update({ status: "deleted" }).eq("id", row.id);
  }
  const videoId = randomUUID();
  const { error } = await db.from("service_videos").insert({
    id: videoId,
    service_id: params.serviceId,
    owner_id: params.profileId,
    storage_path: storagePath,
    filename: params.fileName || `service.${checked.mimeType === "video/mp4" ? "mp4" : "webm"}`,
    mime_type: checked.mimeType,
    file_size: bytes.length,
    duration_seconds: checked.durationSeconds,
    status: "ready",
  });
  if (error) {
    await removeStorageObject(SERVICE_MEDIA_BUCKET, storagePath);
    fail("TEMP_VIDEO_FAILED");
  }
  for (let index = 0; index < params.total; index += 1) {
    await removeStorageObject(
      SERVICE_MEDIA_BUCKET,
      serviceMediaChunkPath(params.profileId, params.serviceId, params.requestId, index)
    );
  }
  return { id: videoId, url: serviceVideoPath(params.serviceId) };
}

export async function removeServiceVideo(profileId: string, serviceId: string) {
  const db = database();
  const service = await ownedService(db, profileId, serviceId);
  if (!service) fail("NOT_FOUND");
  const { data } = await db
    .from("service_videos")
    .select("id,storage_path")
    .eq("service_id", serviceId)
    .eq("status", "ready")
    .maybeSingle();
  if (!data) return;
  await db.from("service_videos").update({ status: "deleted" }).eq("id", data.id);
  await removeStorageObject(SERVICE_MEDIA_BUCKET, data.storage_path);
}

async function visibleObject(serviceId: string, viewerProfileId: string | null, kind: "image" | "video", imageId?: string) {
  const db = database();
  const access = await serviceAccess(db, serviceId);
  if (!access) return null;
  if (!isPublic(access.status) && access.ownerProfileId !== viewerProfileId) return null;
  if (kind === "image") {
    const { data } = await db
      .from("service_images")
      .select("storage_path,mime_type")
      .eq("id", imageId)
      .eq("service_id", serviceId)
      .maybeSingle();
    return data?.storage_path ? { path: String(data.storage_path), mimeType: String(data.mime_type) } : null;
  }
  const { data } = await db
    .from("service_videos")
    .select("storage_path,mime_type")
    .eq("service_id", serviceId)
    .eq("status", "ready")
    .maybeSingle();
  return data?.storage_path ? { path: String(data.storage_path), mimeType: String(data.mime_type) } : null;
}

export async function serviceMediaRedirect(serviceId: string, viewerProfileId: string | null, kind: "image" | "video", imageId?: string) {
  const object = await visibleObject(serviceId, viewerProfileId, kind, imageId);
  if (!object) return null;
  const signed = await createSignedDisplayUrl(SERVICE_MEDIA_BUCKET, object.path);
  return signed.signedUrl;
}
