import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isUuid } from "@/lib/products/ids";
import { requireServiceThumbnailOwner, thumbnailErrorResponse } from "@/lib/services/service-thumbnail-access";
import { createServiceThumbnailRuntime } from "@/lib/services/service-thumbnail-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  previewId: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ serviceId: string }> }
) {
  const access = await requireServiceThumbnailOwner();
  if ("response" in access) return access.response;
  const { serviceId } = await context.params;
  if (!isUuid(serviceId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  try {
    const saved = await createServiceThumbnailRuntime().save(access.profileId, serviceId, parsed.data.previewId);
    return NextResponse.json(saved);
  } catch (error) {
    return thumbnailErrorResponse(error);
  }
}
