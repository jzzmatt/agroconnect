import type { ProductStatus } from "@/types/database";

/** Statuses visible on the public marketplace and provider aggregation. */
export const PUBLIC_PRODUCT_STATUSES = ["published", "active"] as const;

export type PublicProductStatus = (typeof PUBLIC_PRODUCT_STATUSES)[number];

export function isPublicProductStatus(
  status: string | null | undefined
): boolean {
  return (PUBLIC_PRODUCT_STATUSES as readonly string[]).includes(status ?? "");
}

/** Normalize requested create/update status to a supported lifecycle value. */
export function normalizeProductStatus(
  status: ProductStatus | undefined,
  fallback: ProductStatus = "draft"
): ProductStatus {
  if (!status) return fallback;
  if (
    status === "draft" ||
    status === "published" ||
    status === "active" ||
    status === "paused" ||
    status === "archived"
  ) {
    return status;
  }
  return fallback;
}

export function isPublishingTransition(
  currentStatus: string | null | undefined,
  nextStatus: string | null | undefined
): boolean {
  if (!nextStatus) return false;
  if (!isPublicProductStatus(nextStatus)) return false;
  return !isPublicProductStatus(currentStatus);
}
