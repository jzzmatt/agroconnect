import { NextResponse } from "next/server";
import { isUuid } from "@/lib/products/ids";
import { requireProductWhatsappPublisher, whatsappErrorResponse } from "@/lib/whatsapp/http";
import { createProductPublishRuntime } from "@/lib/whatsapp/publish-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ productId: string }> }
) {
  const access = await requireProductWhatsappPublisher();
  if ("response" in access) return access.response;
  const { productId } = await context.params;
  if (!isUuid(productId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    const preview = await createProductPublishRuntime().preview(access.userId, productId);
    return NextResponse.json(preview);
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
