import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CommerceService } from "@/lib/services/commerce-service";
import { ShoppingService } from "@/lib/services/shopping-service";
import { isPublicProductStatus } from "@/lib/products/publication";
import { courseCartItem, publishedCourseLine } from "@/lib/commerce/course-cart";
import { emptyShoppingCart } from "@/lib/commerce/serialize";
import type { CartItemDescriptor, ShoppingCart } from "@/types/commerce";
import {
  GUEST_CART_COOKIE,
  parseGuestCart,
  removeGuestProduct,
  serializeGuestCart,
  type GuestCartLine,
} from "@/lib/commerce/guest-cart";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}

export function applyGuestCartCookie(response: NextResponse, lines: GuestCartLine[]): NextResponse {
  const serialized = serializeGuestCart(lines);
  if (serialized === "[]") {
    response.cookies.delete(GUEST_CART_COOKIE);
    return response;
  }
  response.cookies.set(GUEST_CART_COOKIE, serialized, cookieOptions());
  return response;
}

export async function readGuestCart(): Promise<GuestCartLine[]> {
  const jar = await cookies();
  return parseGuestCart(jar.get(GUEST_CART_COOKIE)?.value);
}

export async function writeGuestCart(lines: GuestCartLine[]): Promise<void> {
  const jar = await cookies();
  const serialized = serializeGuestCart(lines);
  if (serialized === "[]") {
    jar.delete(GUEST_CART_COOKIE);
    return;
  }
  jar.set(GUEST_CART_COOKIE, serialized, cookieOptions());
}

export async function shoppingCartFromLines(lines: GuestCartLine[]): Promise<ShoppingCart> {
  const items: CartItemDescriptor[] = [];
  for (const line of lines) {
    if (line.courseId) {
      const course = await publishedCourseLine(line.courseId);
      if (!course) continue;
      items.push(courseCartItem(course, `guest-${course.courseId}`));
      continue;
    }
    const product = await ShoppingService.getProductById(line.productId).catch(() => null);
    if (!product || !isPublicProductStatus(product.status)) continue;
    if (product.availability_status === "out_of_stock") continue;
    const quantity = line.quantity;
    const unitPrice = Number(product.price) || 0;
    items.push({
      id: `guest-${product.id}`,
      product_id: product.id,
      seller_id: product.seller_id,
      seller_name: product.seller_name || "Vendedor Agrícola",
      seller_slug: product.seller_slug,
      title: product.title,
      slug: product.slug,
      unit_price: unitPrice,
      quantity,
      unit: product.unit || "unidade",
      subtotal: unitPrice * quantity,
      currency: product.currency || "AOA",
      image_url: product.image_url || null,
      max_available_quantity: product.quantity,
      is_available: true,
    });
  }
  const sellers = new Set(items.map((item) => item.seller_id));
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  return {
    id: "guest-cart",
    customer_id: null,
    currency: items[0]?.currency || "AOA",
    items,
    items_count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    delivery_fee: 0,
    discount: 0,
    total: subtotal,
    sellers_count: sellers.size,
  };
}

export async function readGuestShoppingCart(): Promise<ShoppingCart> {
  const lines = await readGuestCart();
  if (lines.length === 0) return emptyShoppingCart();
  return shoppingCartFromLines(lines);
}

/** Copy guest lines into the signed-in cart. Course lines stay at quantity one. */
export async function claimGuestLines(customerId: string, lines: GuestCartLine[]): Promise<GuestCartLine[]> {
  let remaining = [...lines];
  for (const line of lines) {
    try {
      if (line.courseId) {
        await CommerceService.addCatalogCourse(line.courseId, { customerId, persist: true });
      } else {
        await CommerceService.addToCart(
          { productId: line.productId, quantity: line.quantity },
          { customerId, persist: true }
        );
      }
      remaining = removeGuestProduct(remaining, line.courseId || line.productId);
    } catch {
      // Keep a line that could not be saved so the customer does not lose it.
    }
  }
  return remaining;
}

/** Copy the guest cart into the signed-in customer's cart, then drop the saved lines. */
export async function claimGuestCart(customerId: string): Promise<void> {
  const lines = await readGuestCart();
  if (lines.length === 0) return;
  await writeGuestCart(await claimGuestLines(customerId, lines));
}
