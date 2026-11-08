import { PRODUCT_VIDEO_MAX_BYTES } from "@/config/product-catalog";
import { assertTempVideoRequestId } from "@/lib/products/temp-video-lifecycle";
import type { TempVideoRecord } from "@/lib/products/temp-video-lifecycle";

/** Stay under the 4.5 MB request limit in front of the app. */
export const TEMP_VIDEO_CHUNK_BYTES = 3 * 1024 * 1024;
export const TEMP_VIDEO_PART_MAX_BYTES = 3_500_000;

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export function planTempVideoUpload(fileSize: number): { total: number; chunkBytes: number } {
  if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > PRODUCT_VIDEO_MAX_BYTES) {
    fail("PRODUCT_VIDEO_TOO_LARGE");
  }
  return {
    total: Math.ceil(fileSize / TEMP_VIDEO_CHUNK_BYTES),
    chunkBytes: TEMP_VIDEO_CHUNK_BYTES,
  };
}

export function tempVideoChunkPath(userId: string, clientRequestId: string, index: number, total: number): string {
  assertTempVideoRequestId(clientRequestId);
  if (!userId || userId.includes("/") || userId.includes("..")) fail("INVALID_REQUEST");
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || total > 16 || index < 0 || index >= total) {
    fail("INVALID_REQUEST");
  }
  return `${userId}/chunks/${clientRequestId}/${index}`;
}

export function tempVideoThumbnailStagingPath(userId: string, clientRequestId: string): string {
  assertTempVideoRequestId(clientRequestId);
  if (!userId || userId.includes("/") || userId.includes("..")) fail("INVALID_REQUEST");
  return `${userId}/chunks/${clientRequestId}/thumbnail.jpg`;
}

export async function assembleTempVideoChunks(params: {
  userId: string;
  clientRequestId: string;
  total: number;
  fileSize: number;
  read: (path: string) => Promise<Buffer | null>;
}): Promise<Buffer> {
  const plan = planTempVideoUpload(params.fileSize);
  if (params.total !== plan.total) fail("INVALID_REQUEST");
  const parts = await Promise.all(
    Array.from({ length: params.total }, async (_, index) => {
      const path = tempVideoChunkPath(params.userId, params.clientRequestId, index, params.total);
      const part = await params.read(path);
      if (!part || part.length === 0) fail("CHUNK_MISSING");
      return part;
    })
  );
  const video = Buffer.concat(parts);
  if (video.length !== params.fileSize) fail("CHUNK_MISSING");
  return video;
}

export async function finishChunkedTempVideo(params: {
  userId: string;
  clientRequestId: string;
  total: number;
  fileSize: number;
  mimeType: string;
  durationSeconds: number;
  read: (path: string) => Promise<Buffer | null>;
  remove: (path: string) => Promise<void>;
  findSaved: (userId: string, clientRequestId: string) => Promise<TempVideoRecord | null>;
  save: (input: {
    userId: string;
    clientRequestId: string;
    mimeType: string;
    fileSize: number;
    durationSeconds: number;
    bytes: Buffer;
    thumbnailBytes: Buffer;
    thumbnailMimeType: string;
  }) => Promise<TempVideoRecord>;
}): Promise<TempVideoRecord> {
  const existing = await params.findSaved(params.userId, params.clientRequestId);
  if (existing && (existing.status === "saved" || existing.status === "permanent_ready" || existing.status === "transferred") && existing.thumbnailTempPath) {
    return existing;
  }
  const bytes = await assembleTempVideoChunks(params);
  const thumbnailBytes = await params.read(tempVideoThumbnailStagingPath(params.userId, params.clientRequestId));
  if (!thumbnailBytes) fail("THUMBNAIL_REQUIRED");
  const saved = await params.save({
    userId: params.userId,
    clientRequestId: params.clientRequestId,
    mimeType: params.mimeType,
    fileSize: params.fileSize,
    durationSeconds: params.durationSeconds,
    bytes,
    thumbnailBytes,
    thumbnailMimeType: "image/jpeg",
  });
  const paths = [
    tempVideoThumbnailStagingPath(params.userId, params.clientRequestId),
    ...Array.from({ length: params.total }, (_, index) => tempVideoChunkPath(params.userId, params.clientRequestId, index, params.total)),
  ];
  for (const path of paths) {
    await params.remove(path);
  }
  return saved;
}
