import { NextRequest, NextResponse } from "next/server";
import { verifyBunnyWebhook } from "@/lib/video/bunny";

export const runtime = "nodejs";

/**
 * Bunny Stream webhook. AgriAcademy training video is YouTube Unlisted from
 * Phase 7; this endpoint no longer writes Academy lesson records.
 * HMAC verification remains so leftover Bunny deliveries are rejected unsigned.
 * Legacy product-video Bunny rows are reconciled elsewhere (ImageKit is the
 * current product-video provider).
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

  try {
    JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, academy: false });
}
