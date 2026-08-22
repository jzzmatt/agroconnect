import { NextRequest, NextResponse } from "next/server";
import { mapBunnyStatus, verifyBunnyWebhook } from "@/lib/video/bunny";
import { AcademyVideoService } from "@/lib/services/academy-video-service";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  if (!verifyBunnyWebhook(headers)) {
    return NextResponse.json({ error: "Webhook Bunny inválido." }, { status: 401 });
  }

  let payload: any = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const bunnyVideoId = payload.VideoGuid || payload.videoId || payload.guid;
  const status = mapBunnyStatus(payload.Status ?? payload.status);
  if (bunnyVideoId) {
    AcademyVideoService.markStatus(bunnyVideoId, status, {
      duration_seconds: payload.Length || payload.duration,
      thumbnail_url: payload.ThumbnailUrl || null,
    });
  }

  return NextResponse.json({ received: true });
}
