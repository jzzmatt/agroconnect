import { NextResponse } from "next/server";
import { createTransportVehicleVideoUploadAction } from "@/lib/transport/transport-media-actions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await createTransportVehicleVideoUploadAction({
    transportId: String(body?.transportId || ""),
    filename: String(body?.filename || "vehicle-video.mp4"),
    mimeType: String(body?.mimeType || "video/mp4"),
    fileSize: Number(body?.fileSize || 0),
    durationSeconds: Number(body?.durationSeconds || 0),
  });

  if (!result.success) {
    const status = result.code === "AUTH_REQUIRED" ? 401 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
