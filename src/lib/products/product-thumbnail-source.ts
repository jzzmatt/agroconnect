const SOURCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const PRODUCT_THUMBNAIL_SOURCE_MAX_BYTES = 5 * 1024 * 1024;

export type ProductThumbnailSourceType = "image/jpeg" | "image/png" | "image/webp";

export function assertProductThumbnailSource(mimeType: string, size: number): ProductThumbnailSourceType {
  const mime = mimeType.split(";")[0].trim().toLowerCase();
  if (!SOURCE_TYPES.has(mime) || size <= 0 || size > PRODUCT_THUMBNAIL_SOURCE_MAX_BYTES) {
    throw Object.assign(new Error("THUMBNAIL_SOURCE_UNSUPPORTED"), { code: "THUMBNAIL_SOURCE_UNSUPPORTED" });
  }
  return mime as ProductThumbnailSourceType;
}
