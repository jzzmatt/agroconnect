import { isUuid } from "@/lib/commerce/ids";

export const GUEST_CART_COOKIE = "agroconnect_guest_cart";
export const CHECKOUT_PATH = "/checkout";

const MAX_LINES = 30;
const MAX_QUANTITY = 99;

const COURSE_CART_ID = /^[A-Za-z0-9_-]{1,80}$/;

export function isCartCourseId(value: string | null | undefined): value is string {
  return Boolean(value && COURSE_CART_ID.test(value));
}

export interface GuestCartLine {
  productId: string;
  quantity: number;
  courseId?: string;
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
      const record = entry as { productId?: unknown; courseId?: unknown; quantity?: unknown };
      const courseId = String(record.courseId || "");
      if (isCartCourseId(courseId)) {
        lines.push({ productId: courseId, courseId, quantity: 1 });
        if (lines.length >= MAX_LINES) break;
        continue;
      }
      const productId = String(record.productId || "");
      if (!isUuid(productId)) continue;
      lines.push({
        productId,
        quantity: cleanQuantity(Number(record.quantity)),
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
  const index = next.findIndex((line) => !line.courseId && line.productId === productId);
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

export function addGuestCourse(lines: GuestCartLine[], courseId: string): GuestCartLine[] {
  if (!isCartCourseId(courseId)) return lines;
  const without = lines.filter((line) => line.courseId !== courseId);
  if (!lines.some((line) => line.courseId === courseId) && without.length >= MAX_LINES) return lines;
  return [...without, { productId: courseId, courseId, quantity: 1 }];
}

export function setGuestQuantity(lines: GuestCartLine[], productId: string, quantity: number): GuestCartLine[] {
  if (lines.some((line) => line.courseId === productId)) {
    if (quantity <= 0) return lines.filter((line) => line.courseId !== productId);
    return lines.map((line) => (line.courseId === productId ? { ...line, quantity: 1 } : line));
  }
  if (!isUuid(productId)) return lines;
  if (quantity <= 0) return lines.filter((line) => line.productId !== productId);
  return lines.map((line) =>
    !line.courseId && line.productId === productId ? { productId, quantity: cleanQuantity(quantity) } : line
  );
}

export function removeGuestProduct(lines: GuestCartLine[], productId: string): GuestCartLine[] {
  return lines.filter((line) => line.courseId !== productId && line.productId !== productId);
}

function sameGuestLine(left: GuestCartLine, right: GuestCartLine): boolean {
  if (left.courseId || right.courseId) return left.courseId === right.courseId && Boolean(left.courseId);
  return left.productId === right.productId;
}

/** Account quantities stay, and guest quantities are added on top. A course stays at one. */
export function mergeGuestIntoAccount(account: GuestCartLine[], guest: GuestCartLine[]): GuestCartLine[] {
  const merged = [...account];
  for (const line of guest) {
    const index = merged.findIndex((entry) => sameGuestLine(entry, line));
    if (index >= 0) {
      merged[index] = line.courseId
        ? { productId: line.courseId, courseId: line.courseId, quantity: 1 }
        : {
            productId: line.productId,
            quantity: cleanQuantity(merged[index].quantity + line.quantity),
          };
    } else if (merged.length < MAX_LINES) {
      merged.push(
        line.courseId
          ? { productId: line.courseId, courseId: line.courseId, quantity: 1 }
          : { productId: line.productId, quantity: cleanQuantity(line.quantity) }
      );
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
