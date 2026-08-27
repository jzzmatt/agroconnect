import { NextResponse } from "next/server";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { uploadTransportVehicleImageAction } from "@/lib/transport/transport-media-actions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json({ success: false, code: "AUTH_REQUIRED" }, { status: 401 });
    }

    const form = await request.formData();
    const transportId = String(form.get("transportId") || "");
    const file = form.get("file");

    if (!transportId || !(file instanceof File)) {
      return NextResponse.json({ success: false, code: "TRANSPORT_IMAGE_INVALID" }, { status: 400 });
    }

    const mimeType =
      file.type === "image/png" || file.type === "image/webp" ? file.type : ("image/jpeg" as const);
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await uploadTransportVehicleImageAction({
      transportId,
      buffer: bytes,
      fileName: file.name || "vehicle-image.jpg",
      mimeType,
      fileSize: file.size,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: result.code === "AUTH_REQUIRED" ? 401 : 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "TRANSPORT_MEDIA_FAILED";
    return NextResponse.json({ success: false, code: "TRANSPORT_MEDIA_FAILED", message }, { status: 500 });
  }
}
