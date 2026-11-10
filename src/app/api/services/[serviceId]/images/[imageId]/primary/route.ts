import { NextResponse } from "next/server";
import { isUuid } from "@/lib/products/ids";
import { requireServiceThumbnailOwner } from "@/lib/services/service-thumbnail-access";
import { serviceMediaError } from "@/lib/services/service-media-http";
import { makeServiceImagePrimary } from "@/lib/services/service-media-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ serviceId: string; imageId: string }> }
) {
  const access = await requireServiceThumbnailOwner();
  if ("response" in access) return access.response;
  const { serviceId, imageId } = await context.params;
  if (!isUuid(serviceId) || !isUuid(imageId)) return NextResponse.json({ success: false, code: "NOT_FOUND" }, { status: 404 });
  try {
    await makeServiceImagePrimary(access.profileId, serviceId, imageId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serviceMediaError(error);
  }
}
