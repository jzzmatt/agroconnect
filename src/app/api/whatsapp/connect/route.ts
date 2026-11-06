import { NextResponse } from "next/server";
import { requireWhatsappUser, whatsappErrorResponse } from "@/lib/whatsapp/http";
import { createWhatsappRuntime } from "@/lib/whatsapp/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const access = await requireWhatsappUser();
  if ("response" in access) return access.response;
  try {
    const result = await createWhatsappRuntime().connect(access.userId);
    return NextResponse.json(result);
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
