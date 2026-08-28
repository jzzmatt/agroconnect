import type { ProductStatus } from "@/types/database";

export type ProductDeleteDialogKind = "confirm_delete" | "published_block";

/**
 * Published catalogue products must be paused or archived before they can be
 * removed. Draft, paused and archived rows may be deleted.
 */
export function canPermanentlyDeleteProduct(status: ProductStatus | string | null | undefined): boolean {
  return status === "draft" || status === "paused" || status === "archived";
}

export function deleteDialogForProductStatus(
  status: ProductStatus | string | null | undefined
): ProductDeleteDialogKind {
  return canPermanentlyDeleteProduct(status) ? "confirm_delete" : "published_block";
}
