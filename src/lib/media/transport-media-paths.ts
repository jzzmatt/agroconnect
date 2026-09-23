import { safeStorageFileName } from "@/lib/media/supabase-storage-core";
import { extensionFromFilename } from "@/lib/academy/course-thumbnail";

export function buildTransportImageStoragePath(params: {
  ownerId: string;
  transportId: string;
  fileName: string;
}): string {
  const ext = extensionFromFilename(params.fileName) || "jpg";
  return `${params.ownerId}/${params.transportId}/images/${safeStorageFileName(ext)}`;
}

export function buildTransportVideoStoragePath(params: {
  ownerId: string;
  transportId: string;
  fileName: string;
}): string {
  const ext = extensionFromFilename(params.fileName) || "mp4";
  return `${params.ownerId}/${params.transportId}/videos/${safeStorageFileName(ext)}`;
}
