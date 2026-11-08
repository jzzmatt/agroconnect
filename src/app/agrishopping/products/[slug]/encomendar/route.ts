import { NextResponse } from "next/server";
import { ShoppingService } from "@/lib/services/shopping-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Readable order link. Redirects to the existing WhatsApp order route. */
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const origin = new URL(request.url).origin;
  const product = await ShoppingService.getProductBySlug(slug).catch(() => null);
  if (!product?.id) {
    return NextResponse.redirect(new URL("/agrishopping", origin));
  }
  return NextResponse.redirect(new URL(`/order/${product.id}?source=whatsapp`, origin));
}
