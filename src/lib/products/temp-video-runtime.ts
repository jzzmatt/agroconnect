import "server-only";

import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  AGROPRODUCT_MEDIA_BUCKET,
  AGROPRODUCT_TEMP_VIDEO_BUCKET,
} from "@/lib/media/supabase-buckets";
import {
  copyStorageObject,
  removeStorageObject,
  storageObjectExists,
  uploadBufferToStorage,
} from "@/lib/media/supabase-storage-core";
import { SUPABASE_STORAGE_PROVIDER } from "@/lib/media/supabase-buckets";
import {
  cancelTempVideo,
  finalizeTempVideo,
  promoteTempVideo,
  saveTempVideo,
  type TempVideoObjects,
  type TempVideoStore,
} from "@/lib/products/temp-video-service";
import type { TempVideoRecord, TempVideoStatus } from "@/lib/products/temp-video-lifecycle";

function db() {
  const supabase = tryCreateAdminSupabaseClient();
  if (!supabase) throw Object.assign(new Error("STORAGE_UNAVAILABLE"), { code: "STORAGE_UNAVAILABLE" });
  return supabase as unknown as { from: (table: string) => any };
}

function fromRow(row: Record<string, unknown>): TempVideoRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    productId: typeof row.product_id === "string" ? row.product_id : null,
    clientRequestId: String(row.client_request_id),
    status: row.status as TempVideoStatus,
    tempPath: typeof row.temp_path === "string" ? row.temp_path : null,
    permanentPath: typeof row.permanent_path === "string" ? row.permanent_path : null,
    thumbnailTempPath: typeof row.thumbnail_temp_path === "string" ? row.thumbnail_temp_path : null,
    thumbnailPermanentPath: typeof row.thumbnail_permanent_path === "string" ? row.thumbnail_permanent_path : null,
    mimeType: String(row.mime_type),
    fileSize: Number(row.file_size),
    durationSeconds: Number(row.duration_seconds),
    errorCode: typeof row.error_code === "string" ? row.error_code : null,
  };
}

function toPatch(patch: Partial<TempVideoRecord>) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.productId !== undefined) row.product_id = patch.productId;
  if (patch.status) row.status = patch.status;
  if (patch.tempPath !== undefined) row.temp_path = patch.tempPath;
  if (patch.permanentPath !== undefined) row.permanent_path = patch.permanentPath;
  if (patch.thumbnailTempPath !== undefined) row.thumbnail_temp_path = patch.thumbnailTempPath;
  if (patch.thumbnailPermanentPath !== undefined) row.thumbnail_permanent_path = patch.thumbnailPermanentPath;
  if (patch.mimeType) row.mime_type = patch.mimeType;
  if (patch.fileSize) row.file_size = patch.fileSize;
  if (patch.durationSeconds) row.duration_seconds = patch.durationSeconds;
  if (patch.errorCode !== undefined) row.error_code = patch.errorCode;
  return row;
}

const store: TempVideoStore = {
  async findByRequest(userId, clientRequestId) {
    const { data } = await db()
      .from("product_temp_videos")
      .select("*")
      .eq("user_id", userId)
      .eq("client_request_id", clientRequestId)
      .maybeSingle();
    return data ? fromRow(data) : null;
  },
  async findById(id) {
    const { data } = await db().from("product_temp_videos").select("*").eq("id", id).maybeSingle();
    return data ? fromRow(data) : null;
  },
  async insert(record) {
    const { data, error } = await db()
      .from("product_temp_videos")
      .insert({
        id: record.id,
        user_id: record.userId,
        product_id: record.productId,
        client_request_id: record.clientRequestId,
        status: record.status,
        temp_bucket: AGROPRODUCT_TEMP_VIDEO_BUCKET,
        temp_path: record.tempPath,
        thumbnail_temp_path: record.thumbnailTempPath,
        permanent_bucket: AGROPRODUCT_MEDIA_BUCKET,
        permanent_path: record.permanentPath,
        thumbnail_permanent_path: record.thumbnailPermanentPath,
        mime_type: record.mimeType,
        file_size: record.fileSize,
        duration_seconds: record.durationSeconds,
        error_code: record.errorCode,
      })
      .select("*")
      .single();
    if (error || !data) throw Object.assign(new Error(error?.message || "TEMP_VIDEO_FAILED"), { code: "TEMP_VIDEO_FAILED" });
    return fromRow(data);
  },
  async update(id, userId, patch) {
    const { data } = await db()
      .from("product_temp_videos")
      .update(toPatch(patch))
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    return data ? fromRow(data) : null;
  },
  async findReadyVideo(productId, ownerId, path) {
    const { data } = await db()
      .from("product_videos")
      .select("id")
      .eq("product_id", productId)
      .eq("owner_id", ownerId)
      .eq("upload_storage_path", path)
      .eq("status", "ready")
      .maybeSingle();
    return Boolean(data);
  },
  async attachPermanentVideo(record, productId) {
    const supabase = db();
    await supabase
      .from("product_videos")
      .update({ status: "deleted", updated_at: new Date().toISOString() })
      .eq("product_id", productId)
      .eq("owner_id", record.userId)
      .neq("status", "deleted")
      .neq("upload_storage_path", record.permanentPath);
    const { data, error } = await supabase
      .from("product_videos")
      .insert({
        product_id: productId,
        owner_id: record.userId,
        provider: SUPABASE_STORAGE_PROVIDER,
        upload_storage_path: record.permanentPath,
        thumbnail_storage_path: record.thumbnailPermanentPath,
        storage_bucket: AGROPRODUCT_MEDIA_BUCKET,
        filename: `product.${record.mimeType === "video/mp4" ? "mp4" : "webm"}`,
        mime_type: record.mimeType,
        file_size: record.fileSize,
        duration_seconds: record.durationSeconds,
        status: "ready",
        playback_url: null,
      })
      .select("id")
      .single();
    if (error || !data) throw Object.assign(new Error(error?.message || "PRODUCT_VIDEO_FAILED"), { code: "PRODUCT_VIDEO_FAILED" });
    await supabase.from("products").update({ product_video_id: data.id }).eq("id", productId);
  },
};

const objects: TempVideoObjects = {
  async putTemp(path, bytes, contentType) {
    await uploadBufferToStorage({
      bucket: AGROPRODUCT_TEMP_VIDEO_BUCKET,
      storagePath: path,
      buffer: bytes,
      contentType,
    });
  },
  async copyToPermanent(tempPath, permanentPath, contentType) {
    await copyStorageObject({
      sourceBucket: AGROPRODUCT_TEMP_VIDEO_BUCKET,
      sourcePath: tempPath,
      targetBucket: AGROPRODUCT_MEDIA_BUCKET,
      targetPath: permanentPath,
      contentType,
    });
  },
  permanentReadable(path) {
    return storageObjectExists(AGROPRODUCT_MEDIA_BUCKET, path);
  },
  async deleteTemp(path) {
    await removeStorageObject(AGROPRODUCT_TEMP_VIDEO_BUCKET, path);
    const stillThere = await storageObjectExists(AGROPRODUCT_TEMP_VIDEO_BUCKET, path);
    return !stillThere;
  },
};

export function findOwnedTempVideo(userId: string, clientRequestId: string) {
  return store.findByRequest(userId, clientRequestId);
}

export function saveOwnedTempVideo(params: {
  userId: string;
  clientRequestId: string;
  mimeType: string;
  fileSize: number;
  durationSeconds: number;
  bytes: Buffer;
  thumbnailBytes: Buffer;
  thumbnailMimeType: string;
}) {
  return saveTempVideo({ ...params, store, objects });
}

export function cancelOwnedTempVideo(userId: string, tempId: string) {
  return cancelTempVideo({ userId, tempId, store, objects });
}

export function promoteOwnedTempVideo(userId: string, tempId: string, productId: string) {
  return promoteTempVideo({ userId, tempId, productId, store, objects });
}

export function finalizeOwnedTempVideo(userId: string, tempId: string, productId: string) {
  return finalizeTempVideo({ userId, tempId, productId, store, objects });
}
