import { NextResponse } from "next/server";
import { confirmAcademyVideoUploadAction } from "@/lib/services/academy-video-actions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await confirmAcademyVideoUploadAction(String(body?.videoId || ""));
    return NextResponse.json(result, {
      status: result.success ? 200 : result.code === "AUTH_REQUIRED" ? 401 : 400,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        success: false,
        code: "BUNNY_UPLOAD_FAILED",
        message: message || "Não foi possível confirmar o carregamento.",
      },
      { status: /autorizado|unauthor/i.test(message) ? 401 : 500 }
    );
  }
}
