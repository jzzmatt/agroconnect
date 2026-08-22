import { NextRequest, NextResponse } from "next/server";
import { mapBunnyStatus, verifyBunnyWebhook } from "@/lib/video/bunny";
import { AcademyVideoService } from "@/lib/services/academy-video-service";
import { ProductVideoService } from "@/lib/services/product-video-service";
import { createAdminServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  if (!verifyBunnyWebhook(headers)) {
    return NextResponse.json({ error: "Webhook Bunny inválido." }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const bunnyVideoId = String(
    payload.VideoGuid || payload.videoId || payload.guid || ""
  ).trim();
  const status = mapBunnyStatus(Number(payload.Status ?? payload.status));
  const thumbnail = (payload.ThumbnailUrl || payload.thumbnailUrl || null) as string | null;
  const duration = Number(payload.Length || payload.duration || 0) || undefined;

  if (bunnyVideoId) {
    AcademyVideoService.markStatus(bunnyVideoId, status, {
      duration_seconds: duration,
      thumbnail_url: thumbnail,
    });
    ProductVideoService.markStatusByBunnyId(bunnyVideoId, status, {
      duration_seconds: duration,
      thumbnail_url: thumbnail,
    });

    try {
      const supabase = createAdminServerSupabaseClient();
      await (supabase.from("product_videos") as any)
        .update({
          status,
          thumbnail_url: thumbnail,
          duration_seconds: duration,
          updated_at: new Date().toISOString(),
        })
        .eq("bunny_video_id", bunnyVideoId);
    } catch (error) {
      console.warn("[bunny webhook] product_videos persist:", error instanceof Error ? error.message : error);
    }
  }

  return NextResponse.json({ received: true });
}
