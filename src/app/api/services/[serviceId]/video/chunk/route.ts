import { NextResponse } from "next/server";
import { isUuid } from "@/lib/products/ids";
import { TEMP_VIDEO_PART_MAX_BYTES } from "@/lib/products/temp-video-chunks";
import { requireServiceThumbnailOwner } from "@/lib/services/service-thumbnail-access";
import { serviceMediaError } from "@/lib/services/service-media-http";
import { storeServiceVideoChunk } from "@/lib/services/service-media-repository";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ serviceId: string }> }
) {
  const access = await requireServiceThumbnailOwner();
  if ("response" in access) return access.response;
  const { serviceId } = await context.params;
  if (!isUuid(serviceId)) return NextResponse.json({ success: false, code: "NOT_FOUND" }, { status: 404 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const requestId = String(form.get("clientRequestId") || "");
    if (!(file instanceof File) || !isUuid(requestId) || file.size <= 0 || file.size > TEMP_VIDEO_PART_MAX_BYTES) {
      return NextResponse.json({ success: false, code: "PRODUCT_VIDEO_TOO_LARGE" }, { status: 413 });
    }
    await storeServiceVideoChunk({
      profileId: access.profileId,
      serviceId,
      requestId,
      index: Number(form.get("index")),
      total: Number(form.get("total")),
      fileSize: Number(form.get("fileSize")),
      mimeType: String(form.get("mimeType") || "video/webm"),
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return serviceMediaError(error);
  }
}
