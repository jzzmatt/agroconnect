import { NextResponse } from "next/server";
import { confirmTransportVehicleVideoUploadAction } from "@/lib/transport/transport-media-actions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await confirmTransportVehicleVideoUploadAction({
    transportId: String(body?.transportId || ""),
    storagePath: String(body?.storagePath || ""),
    fileId: body?.fileId ? String(body.fileId) : undefined,
    url: body?.url ? String(body.url) : undefined,
    thumbnailUrl: body?.thumbnailUrl ? String(body.thumbnailUrl) : null,
  });

  if (!result.success) {
    const status = result.code === "AUTH_REQUIRED" ? 401 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
