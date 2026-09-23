import { NextResponse } from "next/server";
import { ProductVideoService } from "@/lib/services/product-video-service";
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
  const { data: video } = await supabase
    .from("product_videos")
    .select("*")
    .eq("product_id", productId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!video) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const playback = await ProductVideoService.resolvePlaybackUrl(video as any);
  if (!playback) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.redirect(playback, { status: 302 });
}
