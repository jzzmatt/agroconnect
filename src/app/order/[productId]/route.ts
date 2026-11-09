import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUserProfile } from "@/lib/clerk/auth";
import { isPublicProductStatus } from "@/lib/products/publication";
import { CommerceService } from "@/lib/services/commerce-service";
import { ShoppingService } from "@/lib/services/shopping-service";
import { planWhatsappOrder } from "@/lib/commerce/guest-cart";
import { applyGuestCartCookie, readGuestCart } from "@/lib/commerce/guest-cart-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;
  const { userId } = await auth();
  const profile = userId ? await getCurrentUserProfile() : null;
  const product = await ShoppingService.getProductById(productId).catch(() => null);
  const plan = planWhatsappOrder({
    productId,
    signedIn: Boolean(profile),
    productAvailable: Boolean(product && isPublicProductStatus(product.status)),
    guestLines: await readGuestCart(),
  });

  if (plan.kind === "unavailable") {
    return NextResponse.redirect(new URL("/order/unavailable", request.url));
  }

  if (plan.kind === "account-cart" && profile) {
    try {
      await CommerceService.addToCart(
        { productId, quantity: 1, once: true },
        { customerId: profile.id, persist: true }
      );
    } catch {
      return NextResponse.redirect(new URL("/order/unavailable", request.url));
    }
    return NextResponse.redirect(new URL("/cart", request.url));
  }

  const response = NextResponse.redirect(new URL("/cart", request.url));
  return applyGuestCartCookie(response, plan.kind === "guest-cart" ? plan.lines : []);
}
