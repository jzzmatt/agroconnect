import { PRODUCT_VIDEO_ALLOWED_MIME } from "@/config/product-catalog";
import { deleteBunnyVideo } from "@/lib/video/bunny";
import { buildProductVideoStoragePath } from "@/lib/media/product-media-paths";
import {
  PRODUCT_MEDIA_BUCKET,
  SUPABASE_STORAGE_PROVIDER,
} from "@/lib/media/supabase-buckets";
import {
  createSignedDisplayUrl,
  createSignedUploadUrl,
  removeStorageObject,
  storageObjectExists,
  uploadBufferToStorage,
} from "@/lib/media/supabase-storage-core";
import { getMediaSupabaseClient } from "@/lib/media/db";
import { validateProductVideo } from "@/lib/products/video-validation";
import type { Database } from "@/types/database";

export { validateProductVideo };

export type ProductVideoStatus = Database["public"]["Tables"]["product_videos"]["Row"]["status"];
export type ProductVideoRecord = Database["public"]["Tables"]["product_videos"]["Row"];

const TABLE = "product_videos";

/**
 * Supabase-backed. There is no module-level Map here: every read goes back
 * to `product_videos`, and every write lands there before this returns.
 * New product videos are stored in the private Supabase `product-media` bucket.
 * `bunny_video_id` is only populated on rows created before that move.
 */
export class ProductVideoService {
  public static async listByProduct(productId: string): Promise<ProductVideoRecord[]> {
    const supabase = getMediaSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("product_id", productId)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });
    if (error) throw Object.assign(new Error(error.message), { code: "PRODUCT_VIDEO_READ_FAILED" });
    return (data || []) as ProductVideoRecord[];
  }

  public static async get(videoId: string): Promise<ProductVideoRecord | null> {
    const supabase = getMediaSupabaseClient();
    const { data } = await supabase.from(TABLE).select("*").eq("id", videoId).maybeSingle();
    return (data as ProductVideoRecord | null) || null;
  }

  public static async createUpload(params: {
    ownerId: string;
    productId: string;
    title: string;
    filename: string;
    mimeType: string;
    fileSize: number;
    durationSeconds: number;
  }): Promise<{
    video: ProductVideoRecord;
    upload: { storagePath: string; signedUrl: string; token: string; mimeType: string };
  }> {
    const validation = validateProductVideo({
      mimeType: params.mimeType,
      fileSize: params.fileSize,
      durationSeconds: params.durationSeconds,
      fileName: params.filename,
    });
    if (!validation.ok) {
      throw Object.assign(new Error(validation.error), { code: validation.code });
    }

    // Only one active video per product; replacing it retires the previous one.
    const existing = await this.listByProduct(params.productId);
    for (const previous of existing) {
      await this.markDeleted(previous.id, params.ownerId);
    }

    const storagePath = buildProductVideoStoragePath({
      ownerId: params.ownerId,
      productId: params.productId,
      fileName: params.filename,
    });

    let signed;
    try {
      signed = await createSignedUploadUrl(PRODUCT_MEDIA_BUCKET, storagePath);
    } catch {
      throw Object.assign(new Error("Não foi possível preparar o envio do vídeo."), {
        code: "PRODUCT_VIDEO_FAILED",
      });
    }

    const supabase = getMediaSupabaseClient();
    const { data, error } = await (supabase.from(TABLE) as any)
      .insert({
        product_id: params.productId,
        owner_id: params.ownerId,
        provider: SUPABASE_STORAGE_PROVIDER,
        upload_storage_path: storagePath,
        filename: params.filename,
        mime_type: params.mimeType as "video/mp4" | "video/webm",
        file_size: params.fileSize,
        duration_seconds: params.durationSeconds,
        status: "uploading",
      })
      .select()
      .single();
    if (error || !data) {
      await removeStorageObject(PRODUCT_MEDIA_BUCKET, storagePath);
      throw Object.assign(new Error(error?.message || "Não foi possível registar o vídeo."), {
        code: "PRODUCT_VIDEO_FAILED",
      });
    }

    const video = data as ProductVideoRecord;
    await (supabase.from("products") as any).update({ product_video_id: video.id }).eq("id", params.productId);

    return {
      video,
      upload: {
        storagePath,
        signedUrl: signed.signedUrl,
        token: signed.token,
        mimeType: params.mimeType,
      },
    };
  }

  /** Stores the file from the app server. The browser never calls Storage directly. */
  public static async saveUploadedFile(params: {
    videoId: string;
    ownerId: string;
    productId: string;
    buffer: Buffer;
    fileSize: number;
    contentType: string;
  }): Promise<ProductVideoRecord | null> {
    const video = await this.get(params.videoId);
    const path = video?.upload_storage_path;
    const prefix = `${params.ownerId}/${params.productId}/videos/`;
    if (!video || video.owner_id !== params.ownerId || video.product_id !== params.productId || !path?.startsWith(prefix)) {
      return null;
    }
    await uploadBufferToStorage({
      bucket: PRODUCT_MEDIA_BUCKET,
      storagePath: path,
      buffer: params.buffer,
      contentType: params.contentType,
    });
    return this.confirmUpload({
      videoId: params.videoId,
      ownerId: params.ownerId,
      storagePath: path,
      fileSize: params.fileSize,
    });
  }

  public static async resolvePlaybackUrl(video: ProductVideoRecord): Promise<string | null> {
    if (video.provider === SUPABASE_STORAGE_PROVIDER && video.upload_storage_path) {
      const bucket = (video as ProductVideoRecord & { storage_bucket?: string | null }).storage_bucket || PRODUCT_MEDIA_BUCKET;
      try {
        const { signedUrl } = await createSignedDisplayUrl(bucket, video.upload_storage_path);
        return signedUrl;
      } catch {
        return video.playback_url;
      }
    }
    return video.playback_url;
  }

  /** Marks the video ready after the browser stores the file in Supabase. */
  public static async confirmUpload(params: {
    videoId: string;
    ownerId: string;
    externalId?: string;
    url?: string;
    storagePath?: string;
    thumbnailUrl?: string | null;
    fileSize?: number;
  }): Promise<ProductVideoRecord | null> {
    const supabase = getMediaSupabaseClient();
    const { data: current } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", params.videoId)
      .eq("owner_id", params.ownerId)
      .maybeSingle();
    const row = current as ProductVideoRecord | null;
    if (!row) return null;

    if (row.provider === SUPABASE_STORAGE_PROVIDER) {
      const path = params.storagePath || row.upload_storage_path;
      if (!path || !(await storageObjectExists(PRODUCT_MEDIA_BUCKET, path))) {
        await this.markFailed(params.videoId, params.ownerId, "Upload not found in storage.");
        return null;
      }
      const patch: Database["public"]["Tables"]["product_videos"]["Update"] = {
        status: "ready",
        upload_storage_path: path,
        playback_url: null,
        thumbnail_url: params.thumbnailUrl ?? null,
        updated_at: new Date().toISOString(),
      };
      if (typeof params.fileSize === "number" && params.fileSize > 0) {
        patch.file_size = params.fileSize;
      }
      const { data } = await (supabase.from(TABLE) as any)
        .update(patch)
        .eq("id", params.videoId)
        .eq("owner_id", params.ownerId)
        .select()
        .maybeSingle();
      const updated = (data as ProductVideoRecord | null) || null;
      if (updated) {
        const playback = await this.resolvePlaybackUrl(updated);
        return { ...updated, playback_url: playback };
      }
      return updated;
    }

    const patch: Database["public"]["Tables"]["product_videos"]["Update"] = {
      status: "ready",
      external_id: params.externalId,
      playback_url: params.url,
      thumbnail_url: params.thumbnailUrl ?? null,
      updated_at: new Date().toISOString(),
    };
    if (typeof params.fileSize === "number" && params.fileSize > 0) {
      patch.file_size = params.fileSize;
    }
    const { data } = await (supabase.from(TABLE) as any)
      .update(patch)
      .eq("id", params.videoId)
      .eq("owner_id", params.ownerId)
      .select()
      .maybeSingle();
    return (data as ProductVideoRecord | null) || null;
  }

  public static async markFailed(videoId: string, ownerId: string, message?: string): Promise<boolean> {
    const supabase = getMediaSupabaseClient();
    const { data } = await (supabase.from(TABLE) as any)
      .update({ status: "failed", error_message: message || null, updated_at: new Date().toISOString() })
      .eq("id", videoId)
      .eq("owner_id", ownerId)
      .select()
      .maybeSingle();
    return Boolean(data);
  }

  public static async markDeleted(videoId: string, ownerId: string): Promise<boolean> {
    const supabase = getMediaSupabaseClient();
    const { data: current } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", videoId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    const video = current as ProductVideoRecord | null;
    if (!video) return false;

    await (supabase.from(TABLE) as any)
      .update({ status: "deleted", updated_at: new Date().toISOString() })
      .eq("id", videoId)
      .eq("owner_id", ownerId);

    if (video.provider === SUPABASE_STORAGE_PROVIDER && video.upload_storage_path) {
      const bucket = (video as ProductVideoRecord & { storage_bucket?: string | null }).storage_bucket || PRODUCT_MEDIA_BUCKET;
      void removeStorageObject(bucket, video.upload_storage_path).catch(() => undefined);
    } else if (video.bunny_video_id) {
      // Legacy rows created before Phase 4 narrowed Bunny to Academy-only.
      void deleteBunnyVideo(video.bunny_video_id).catch(() => undefined);
    }
    return true;
  }
}

export const PRODUCT_VIDEO_ALLOWED = PRODUCT_VIDEO_ALLOWED_MIME;
