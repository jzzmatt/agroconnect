import { NextResponse } from "next/server";
import { ProductVideoService } from "@/lib/services/product-video-service";
import { getMediaSupabaseClient } from "@/lib/media/db";
import { downloadStorageObject } from "@/lib/media/supabase-storage-core";
import { AGROPRODUCT_MEDIA_BUCKET, PRODUCT_MEDIA_BUCKET } from "@/lib/media/supabase-buckets";
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
  const row = video as { thumbnail_storage_path?: string | null; storage_bucket?: string | null; provider?: string | null } | null;
  const path = row?.thumbnail_storage_path;
  if (!row || !path) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const bucket = row.storage_bucket || (row.provider === "supabase_storage" ? AGROPRODUCT_MEDIA_BUCKET : PRODUCT_MEDIA_BUCKET);
  let bytes: Buffer | null = null;
  try {
    bytes = await downloadStorageObject(bucket, path);
  } catch {
    bytes = null;
  }
  if (!bytes || bytes.length === 0) {
    const signed = await ProductVideoService.resolveThumbnailUrl(video as never);
    if (signed) return NextResponse.redirect(signed, { status: 302 });
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const type = path.endsWith(".webp") ? "image/webp" : path.endsWith(".png") ? "image/png" : "image/jpeg";
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=3600",
    },
  });
}
