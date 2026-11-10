import { NextResponse } from "next/server";
import { isUuid } from "@/lib/products/ids";
import { currentViewerProfileId, requireServiceThumbnailOwner } from "@/lib/services/service-thumbnail-access";
import { serviceMediaError } from "@/lib/services/service-media-http";
import { removeServiceImage, serviceMediaRedirect } from "@/lib/services/service-media-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ serviceId: string; imageId: string }> }
) {
  const { serviceId, imageId } = await context.params;
  if (!isUuid(serviceId) || !isUuid(imageId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    const url = await serviceMediaRedirect(serviceId, await currentViewerProfileId(), "image", imageId);
    if (!url) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.redirect(url, { status: 302 });
  } catch (error) {
    return serviceMediaError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ serviceId: string; imageId: string }> }
) {
  const access = await requireServiceThumbnailOwner();
  if ("response" in access) return access.response;
  const { serviceId, imageId } = await context.params;
  if (!isUuid(serviceId) || !isUuid(imageId)) return NextResponse.json({ success: false, code: "NOT_FOUND" }, { status: 404 });
  try {
    await removeServiceImage(access.profileId, serviceId, imageId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serviceMediaError(error);
  }
}
