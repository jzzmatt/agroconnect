import { safeStorageFileName } from "@/lib/media/supabase-storage-core";
import { extensionFromFilename } from "@/lib/academy/course-thumbnail";

export function buildProductImageStoragePath(params: {
  ownerId: string;
  productId: string;
  fileName: string;
}): string {
  const ext = extensionFromFilename(params.fileName) || "jpg";
  return `${params.ownerId}/${params.productId}/images/${safeStorageFileName(ext)}`;
}

export function buildProductVideoStoragePath(params: {
  ownerId: string;
  productId: string;
  fileName: string;
}): string {
  const ext = extensionFromFilename(params.fileName) || "mp4";
  return `${params.ownerId}/${params.productId}/videos/${safeStorageFileName(ext)}`;
}
