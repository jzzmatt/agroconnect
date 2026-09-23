import { NextResponse } from "next/server";
import { ProductMediaService } from "@/lib/services/product-media-service";
import { getMediaSupabaseClient } from "@/lib/media/db";
import { isUuid } from "@/lib/products/ids";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ productId: string }> }
) {
  const { productId } = await context.params;
  if (!isUuid(productId)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const supabase = getMediaSupabaseClient();
  const { data: primary } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .eq("is_primary", true)
    .maybeSingle();

  if (!primary) {
    const { data: fallback } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!fallback) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const url = await ProductMediaService.resolveImageDisplayUrl(fallback as any);
    if (!url) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.redirect(url, { status: 302 });
  }

  const url = await ProductMediaService.resolveImageDisplayUrl(primary as any);
  if (!url) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.redirect(url, { status: 302 });
}
