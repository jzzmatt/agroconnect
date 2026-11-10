import { NextResponse } from "next/server";
import { isUuid } from "@/lib/products/ids";
import { requireServiceWhatsappPublisher, whatsappErrorResponse } from "@/lib/whatsapp/http";
import { createServicePublishRuntime } from "@/lib/whatsapp/service-publish-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ publicationId: string }> }
) {
  const access = await requireServiceWhatsappPublisher();
  if ("response" in access) return access.response;
  const { publicationId } = await context.params;
  if (!isUuid(publicationId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    const publication = await createServicePublishRuntime().retry(access.userId, publicationId);
    return NextResponse.json({ publication });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
