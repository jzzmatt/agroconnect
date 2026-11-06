import { NextRequest, NextResponse } from "next/server";
import { createWhatsappRuntime } from "@/lib/whatsapp/runtime";
import { WhatsappServiceError } from "@/lib/whatsapp/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 512_000;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  try {
    await createWhatsappRuntime().handleWebhook(token, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WhatsappServiceError && error.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (error instanceof WhatsappServiceError && error.status < 500) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    console.error("[whatsapp] webhook failed");
    return NextResponse.json({ error: "UNEXPECTED" }, { status: 500 });
  }
}
