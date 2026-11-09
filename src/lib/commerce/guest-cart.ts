import { isUuid } from "@/lib/commerce/ids";

export const GUEST_CART_COOKIE = "agroconnect_guest_cart";
export const CHECKOUT_PATH = "/checkout";

const MAX_LINES = 30;
const MAX_QUANTITY = 99;

export interface GuestCartLine {
  productId: string;
  quantity: number;
}

function cleanQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));
}

export function parseGuestCart(raw: string | null | undefined): GuestCartLine[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const lines: GuestCartLine[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const productId = String((entry as { productId?: unknown }).productId || "");
      if (!isUuid(productId)) continue;
      lines.push({
        productId,
        quantity: cleanQuantity(Number((entry as { quantity?: unknown }).quantity)),
      });
      if (lines.length >= MAX_LINES) break;
    }
    return lines;
  } catch {
    return [];
  }
}

export function serializeGuestCart(lines: GuestCartLine[]): string {
  return JSON.stringify(parseGuestCart(JSON.stringify(lines)));
}

export function addGuestProduct(
  lines: GuestCartLine[],
  productId: string,
  quantity = 1,
  once = false
): GuestCartLine[] {
  if (!isUuid(productId)) return lines;
  const next = [...lines];
  const index = next.findIndex((line) => line.productId === productId);
  if (index >= 0 && once) return next;
  if (index >= 0) {
    next[index] = {
      productId,
      quantity: cleanQuantity(next[index].quantity + quantity),
    };
    return next;
  }
  if (next.length >= MAX_LINES) return next;
  next.push({ productId, quantity: cleanQuantity(quantity) });
  return next;
}

export function setGuestQuantity(lines: GuestCartLine[], productId: string, quantity: number): GuestCartLine[] {
  if (!isUuid(productId)) return lines;
  if (quantity <= 0) return lines.filter((line) => line.productId !== productId);
  return lines.map((line) =>
    line.productId === productId ? { productId, quantity: cleanQuantity(quantity) } : line
  );
}

export function removeGuestProduct(lines: GuestCartLine[], productId: string): GuestCartLine[] {
  return lines.filter((line) => line.productId !== productId);
}

/** Account quantities stay, and guest quantities are added on top. */
export function mergeGuestIntoAccount(account: GuestCartLine[], guest: GuestCartLine[]): GuestCartLine[] {
  const merged = [...account];
  for (const line of guest) {
    const index = merged.findIndex((entry) => entry.productId === line.productId);
    if (index >= 0) {
      merged[index] = {
        productId: line.productId,
        quantity: cleanQuantity(merged[index].quantity + line.quantity),
      };
    } else if (merged.length < MAX_LINES) {
      merged.push({ productId: line.productId, quantity: cleanQuantity(line.quantity) });
    }
  }
  return merged;
}

export type WhatsappOrderPlan =
  | { kind: "unavailable" }
  | { kind: "account-cart" }
  | { kind: "guest-cart"; lines: GuestCartLine[] };

/**
 * The WhatsApp order link always continues to the cart.
 * Sign-in happens later, when the customer submits the purchase.
 */
export function planWhatsappOrder(input: {
  productId: string;
  signedIn: boolean;
  productAvailable: boolean;
  guestLines: GuestCartLine[];
}): WhatsappOrderPlan {
  if (!isUuid(input.productId) || !input.productAvailable) return { kind: "unavailable" };
  if (input.signedIn) return { kind: "account-cart" };
  return {
    kind: "guest-cart",
    lines: addGuestProduct(input.guestLines, input.productId, 1, true),
  };
}

export function cartCheckoutHref(signedIn: boolean): string {
  if (signedIn) return CHECKOUT_PATH;
  return `/sign-in?redirect_url=${encodeURIComponent(CHECKOUT_PATH)}`;
}
