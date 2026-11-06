import type { ProductStatus } from "@/types/database";

export type ProductDeleteDialogKind = "confirm_delete" | "published_block";

/**
 * A seller may permanently delete a product they created, including one that
 * is already published. Unknown or missing statuses stay blocked.
 */
export function canPermanentlyDeleteProduct(status: ProductStatus | string | null | undefined): boolean {
  return (
    status === "draft" ||
    status === "paused" ||
    status === "archived" ||
    status === "published" ||
    status === "active"
  );
}

export function deleteDialogForProductStatus(
  status: ProductStatus | string | null | undefined
): ProductDeleteDialogKind {
  return canPermanentlyDeleteProduct(status) ? "confirm_delete" : "published_block";
}
