import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isUuid } from "@/lib/products/ids";
import { requireServiceThumbnailOwner } from "@/lib/services/service-thumbnail-access";
import { serviceMediaError } from "@/lib/services/service-media-http";
import { completeServiceVideo } from "@/lib/services/service-media-repository";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  clientRequestId: z.string().uuid(),
  total: z.number().int().positive(),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
  durationSeconds: z.number().positive(),
  fileName: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ serviceId: string }> }
) {
  const access = await requireServiceThumbnailOwner();
  if ("response" in access) return access.response;
  const { serviceId } = await context.params;
  if (!isUuid(serviceId)) return NextResponse.json({ success: false, code: "NOT_FOUND" }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, code: "INVALID_REQUEST" }, { status: 400 });
  try {
    const video = await completeServiceVideo({
      profileId: access.profileId,
      serviceId,
      requestId: parsed.data.clientRequestId,
      total: parsed.data.total,
      fileSize: parsed.data.fileSize,
      mimeType: parsed.data.mimeType,
      durationSeconds: parsed.data.durationSeconds,
      fileName: parsed.data.fileName,
    });
    return NextResponse.json({ success: true, video });
  } catch (error) {
    return serviceMediaError(error);
  }
}
