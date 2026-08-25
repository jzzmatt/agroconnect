import type { ProductAvailabilityStatus } from "@/types/database";

export interface ProductInventoryUpdate {
  quantity?: number;
  availabilityStatus?: ProductAvailabilityStatus;
}

/**
 * Inventory source of truth for Commerce: `products.quantity` plus
 * `products.availability_status`. Checkout deduction is implemented in Phase 11.
 */
export function deriveAvailabilityFromQuantity(
  quantity: number,
  current?: ProductAvailabilityStatus | null
): ProductAvailabilityStatus {
  if (quantity <= 0) return "out_of_stock";
  if (current === "limited" || current === "pre_order") return current;
  return "in_stock";
}

export function buildInventoryPatch(
  patch: ProductInventoryUpdate
): Record<string, number | ProductAvailabilityStatus> {
  const updates: Record<string, number | ProductAvailabilityStatus> = {};

  if (patch.quantity !== undefined) {
    updates.quantity = patch.quantity;
    if (patch.availabilityStatus === undefined) {
      updates.availability_status = deriveAvailabilityFromQuantity(patch.quantity);
    }
  }

  if (patch.availabilityStatus !== undefined) {
    updates.availability_status = patch.availabilityStatus;
  }

  return updates;
}
