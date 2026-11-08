import { NextResponse } from "next/server";
import { ShoppingService } from "@/lib/services/shopping-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Readable product video link. Redirects to the permanent playback route. */
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const origin = new URL(request.url).origin;
  const product = await ShoppingService.getProductBySlug(slug).catch(() => null);
  if (!product?.id || !product.slug) {
    return NextResponse.redirect(new URL("/agrishopping", origin));
  }
  if (!product.has_video) {
    return NextResponse.redirect(new URL(`/agrishopping/products/${encodeURIComponent(product.slug)}`, origin));
  }
  return NextResponse.redirect(new URL(`/api/products/${product.id}/video-playback`, origin));
}
