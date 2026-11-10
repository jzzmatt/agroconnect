import { NextResponse } from "next/server";
import { isUuid } from "@/lib/products/ids";
import { requireServiceThumbnailOwner } from "@/lib/services/service-thumbnail-access";
import { serviceMediaError } from "@/lib/services/service-media-http";
import { addServiceImage } from "@/lib/services/service-media-repository";

export const runtime = "nodejs";
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
    if (!(file instanceof File)) return NextResponse.json({ success: false, code: "INVALID_REQUEST" }, { status: 400 });
    const image = await addServiceImage({
      profileId: access.profileId,
      serviceId,
      bytes: Buffer.from(await file.arrayBuffer()),
      fileName: file.name || "service.jpg",
      mimeType: file.type || "image/jpeg",
    });
    return NextResponse.json({ success: true, image });
  } catch (error) {
    return serviceMediaError(error);
  }
}
