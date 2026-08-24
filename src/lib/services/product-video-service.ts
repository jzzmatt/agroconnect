import { PRODUCT_VIDEO_ALLOWED_MIME } from "@/config/product-catalog";
import { deleteBunnyVideo } from "@/lib/video/bunny";
import {
  createImageKitUploadAuth,
  deleteImageKitFile,
  productMediaFolder,
  type ImageKitUploadAuth,
} from "@/lib/media/imagekit";
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
 * Product video moved off Bunny in Phase 4 — new rows always use ImageKit;
 * `bunny_video_id` is only ever populated on rows created before this phase.
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
  }): Promise<{ video: ProductVideoRecord; upload: ImageKitUploadAuth }> {
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

    const upload = createImageKitUploadAuth({
      folder: productMediaFolder(params.productId, "videos"),
    });
    if (!upload.configured) {
      throw Object.assign(new Error(upload.error || "ImageKit não está configurado."), {
        code: upload.code || "IMAGEKIT_NOT_CONFIGURED",
      });
    }

    const supabase = getMediaSupabaseClient();
    const { data, error } = await (supabase.from(TABLE) as any)
      .insert({
        product_id: params.productId,
        owner_id: params.ownerId,
        provider: "imagekit",
        filename: params.filename,
        mime_type: params.mimeType as "video/mp4" | "video/webm",
        file_size: params.fileSize,
        duration_seconds: params.durationSeconds,
        status: "uploading",
      })
      .select()
      .single();
    if (error || !data) {
      throw Object.assign(new Error(error?.message || "Não foi possível registar o vídeo."), {
        code: "IMAGEKIT_UPLOAD_FAILED",
      });
    }

    const video = data as ProductVideoRecord;
    await (supabase.from("products") as any).update({ product_video_id: video.id }).eq("id", params.productId);

    return { video, upload };
  }

  /**
   * Called once the browser finishes the direct ImageKit upload. ImageKit
   * uploads are synchronous — there is no separate transcoding wait like
   * Bunny's — so this is the terminal "ready" transition instead of a
   * webhook callback.
   */
  public static async confirmUpload(params: {
    videoId: string;
    ownerId: string;
    externalId: string;
    url: string;
    thumbnailUrl?: string | null;
    fileSize?: number;
  }): Promise<ProductVideoRecord | null> {
    const supabase = getMediaSupabaseClient();
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

    if (video.provider === "imagekit" && video.external_id) {
      void deleteImageKitFile(video.external_id).catch(() => undefined);
    } else if (video.bunny_video_id) {
      // Legacy rows created before Phase 4 narrowed Bunny to Academy-only.
      void deleteBunnyVideo(video.bunny_video_id).catch(() => undefined);
    }
    return true;
  }
}

export const PRODUCT_VIDEO_ALLOWED = PRODUCT_VIDEO_ALLOWED_MIME;
