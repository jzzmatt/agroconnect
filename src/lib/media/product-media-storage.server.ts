import "server-only";

import { buildProductImageStoragePath } from "@/lib/media/product-media-paths";
import { PRODUCT_MEDIA_BUCKET } from "@/lib/media/supabase-buckets";
import {
  createSignedDisplayUrl,
  createSignedUploadUrl,
  removeStorageObject,
  storageObjectExists,
  uploadBufferToStorage,
} from "@/lib/media/supabase-storage-core";

export {
  buildProductImageStoragePath,
  PRODUCT_MEDIA_BUCKET,
};

export async function uploadProductImageBuffer(params: {
  storagePath: string;
  buffer: Buffer;
  contentType: string;
}) {
  await uploadBufferToStorage({
    bucket: PRODUCT_MEDIA_BUCKET,
    storagePath: params.storagePath,
    buffer: params.buffer,
    contentType: params.contentType,
  });
}

export async function productImageSignedUpload(storagePath: string) {
  return createSignedUploadUrl(PRODUCT_MEDIA_BUCKET, storagePath);
}

export async function productImageSignedDisplay(storagePath: string) {
  return createSignedDisplayUrl(PRODUCT_MEDIA_BUCKET, storagePath);
}

export async function removeProductImageObject(storagePath: string | null | undefined) {
  await removeStorageObject(PRODUCT_MEDIA_BUCKET, storagePath);
}

export async function productImageObjectExists(storagePath: string) {
  return storageObjectExists(PRODUCT_MEDIA_BUCKET, storagePath);
}
