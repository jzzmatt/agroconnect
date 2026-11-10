import { NextResponse } from "next/server";
import { isUuid } from "@/lib/products/ids";
import { currentViewerProfileId, thumbnailErrorResponse } from "@/lib/services/service-thumbnail-access";
import { createServiceThumbnailRuntime } from "@/lib/services/service-thumbnail-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await context.params;
  if (!isUuid(serviceId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    const saved = await createServiceThumbnailRuntime().read(serviceId, await currentViewerProfileId());
    if (!saved) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return new NextResponse(new Uint8Array(saved.bytes), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    return thumbnailErrorResponse(error);
  }
}
