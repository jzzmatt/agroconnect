import { NextResponse } from "next/server";
import { isUuid } from "@/lib/products/ids";
import { requireServiceThumbnailOwner, thumbnailErrorResponse } from "@/lib/services/service-thumbnail-access";
import { createServiceThumbnailRuntime } from "@/lib/services/service-thumbnail-runtime";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ serviceId: string }> }
) {
  const access = await requireServiceThumbnailOwner();
  if ("response" in access) return access.response;
  const { serviceId } = await context.params;
  if (!isUuid(serviceId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    const preview = await createServiceThumbnailRuntime().generate(access.profileId, serviceId);
    return NextResponse.json(preview);
  } catch (error) {
    return thumbnailErrorResponse(error);
  }
}
