import { NextResponse } from "next/server";
import { isUuid } from "@/lib/products/ids";
import { currentViewerProfileId } from "@/lib/services/service-thumbnail-access";
import { serviceMediaError } from "@/lib/services/service-media-http";
import { listServiceMedia } from "@/lib/services/service-media-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await context.params;
  if (!isUuid(serviceId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    const viewer = await currentViewerProfileId();
    const media = await listServiceMedia(serviceId, viewer);
    return NextResponse.json(media || { images: [], video: null });
  } catch (error) {
    return serviceMediaError(error);
  }
}
