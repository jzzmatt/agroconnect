import { NextResponse } from "next/server";
import { isUuid } from "@/lib/products/ids";
import { currentViewerProfileId, requireServiceThumbnailOwner } from "@/lib/services/service-thumbnail-access";
import { serviceMediaError } from "@/lib/services/service-media-http";
import { removeServiceVideo, serviceMediaRedirect } from "@/lib/services/service-media-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await context.params;
  if (!isUuid(serviceId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    const url = await serviceMediaRedirect(serviceId, await currentViewerProfileId(), "video");
    if (!url) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.redirect(url, { status: 302 });
  } catch (error) {
    return serviceMediaError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ serviceId: string }> }
) {
  const access = await requireServiceThumbnailOwner();
  if ("response" in access) return access.response;
  const { serviceId } = await context.params;
  if (!isUuid(serviceId)) return NextResponse.json({ success: false, code: "NOT_FOUND" }, { status: 404 });
  try {
    await removeServiceVideo(access.profileId, serviceId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serviceMediaError(error);
  }
}
