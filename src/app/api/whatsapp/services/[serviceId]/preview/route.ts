import { NextResponse } from "next/server";
import { isUuid } from "@/lib/products/ids";
import { requireServiceWhatsappPublisher, whatsappErrorResponse } from "@/lib/whatsapp/http";
import { createServicePublishRuntime } from "@/lib/whatsapp/service-publish-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ serviceId: string }> }
) {
  const access = await requireServiceWhatsappPublisher();
  if ("response" in access) return access.response;
  const { serviceId } = await context.params;
  if (!isUuid(serviceId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    const preview = await createServicePublishRuntime().preview(access.userId, serviceId);
    return NextResponse.json(preview);
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
