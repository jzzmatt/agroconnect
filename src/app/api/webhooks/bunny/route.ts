import { NextRequest, NextResponse } from "next/server";
import { mapBunnyStatus, verifyBunnyWebhook } from "@/lib/video/bunny";
import { AcademyVideoService } from "@/lib/services/academy-video-service";

export const runtime = "nodejs";

/**
 * Bunny Stream webhook. Phase 4 narrowed Bunny to AgriAcademy training video
 * only, so this only ever touches `academy_videos` — product video moved to
 * ImageKit and is confirmed synchronously by the browser instead
 * (see /api/products/video/complete).
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  if (!verifyBunnyWebhook(raw, headers)) {
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
    try {
      await AcademyVideoService.markStatusByBunnyId(bunnyVideoId, status, {
        duration_seconds: duration,
        thumbnail_url: thumbnail,
      });
    } catch (error) {
      console.warn("[bunny webhook] academy_videos persist:", error instanceof Error ? error.message : error);
    }
  }

  return NextResponse.json({ received: true });
}
