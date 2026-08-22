import { PRODUCT_VIDEO_ALLOWED_MIME } from "@/config/product-catalog";
import { createBunnyVideo, deleteBunnyVideo, isBunnyConfigured } from "@/lib/video/bunny";
import { validateProductVideo } from "@/lib/products/video-validation";
export { validateProductVideo };

export type ProductVideoStatus = "pending" | "uploading" | "processing" | "ready" | "failed" | "deleted";

export type ProductVideoRecord = {
  id: string;
  product_id: string;
  owner_id: string;
  bunny_video_id?: string | null;
  bunny_library_id?: string | null;
  filename?: string | null;
  mime_type?: string | null;
  file_size: number;
  duration_seconds: number;
  status: ProductVideoStatus;
  thumbnail_url?: string | null;
  playback_url?: string | null;
  created_at: string;
  updated_at: string;
};

const videos = new Map<string, ProductVideoRecord>();

export class ProductVideoService {
  public static listByProduct(productId: string): ProductVideoRecord[] {
    return [...videos.values()].filter((v) => v.product_id === productId && v.status !== "deleted");
  }

  public static get(videoId: string): ProductVideoRecord | null {
    return videos.get(videoId) || null;
  }

  public static async createUpload(params: {
    ownerId: string;
    productId: string;
    title: string;
    filename: string;
    mimeType: string;
    fileSize: number;
    durationSeconds: number;
  }): Promise<{ video: ProductVideoRecord; upload: Awaited<ReturnType<typeof createBunnyVideo>> }> {
    const validation = validateProductVideo({
      mimeType: params.mimeType,
      fileSize: params.fileSize,
      durationSeconds: params.durationSeconds,
      fileName: params.filename,
    });
    if (!validation.ok) {
      throw Object.assign(new Error(validation.error), { code: validation.code });
    }

    const existing = this.listByProduct(params.productId);
    for (const previous of existing) {
      this.markDeleted(previous.id, params.ownerId);
    }

    const bunny = await createBunnyVideo({ title: params.title });
    const now = new Date().toISOString();
    const record: ProductVideoRecord = {
      id: `pvid-${Math.random().toString(36).slice(2, 10)}`,
      product_id: params.productId,
      owner_id: params.ownerId,
      bunny_video_id: bunny.bunnyVideoId,
      bunny_library_id: bunny.bunnyLibraryId,
      filename: params.filename,
      mime_type: params.mimeType,
      file_size: params.fileSize,
      duration_seconds: params.durationSeconds,
      status: bunny.bunnyVideoId ? "uploading" : "ready",
      thumbnail_url: null,
      playback_url: bunny.uploadUrl,
      created_at: now,
      updated_at: now,
    };
    videos.set(record.id, record);
    return { video: record, upload: bunny };
  }

  public static markReady(videoId: string, extra?: Partial<ProductVideoRecord>) {
    const current = videos.get(videoId);
    if (!current) return null;
    const next = { ...current, ...extra, status: "ready" as const, updated_at: new Date().toISOString() };
    videos.set(videoId, next);
    return next;
  }

  public static markDeleted(videoId: string, ownerId: string) {
    const current = videos.get(videoId);
    if (!current || current.owner_id !== ownerId) return false;
    videos.set(videoId, { ...current, status: "deleted", updated_at: new Date().toISOString() });
    if (current.bunny_video_id && isBunnyConfigured()) {
      void deleteBunnyVideo(current.bunny_video_id).catch(() => undefined);
    }
    return true;
  }
}

export const PRODUCT_VIDEO_ALLOWED = PRODUCT_VIDEO_ALLOWED_MIME;
