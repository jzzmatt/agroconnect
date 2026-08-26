import { NextResponse } from "next/server";
import { uploadAcademyVideoBinaryAction } from "@/lib/services/academy-video-actions";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const videoId = String(formData.get("videoId") || "").trim();
    const file = formData.get("file");

    if (!videoId || !(file instanceof File) || file.size <= 0) {
      return NextResponse.json(
        {
          success: false,
          code: "BUNNY_UPLOAD_FAILED",
          message: "Ficheiro de vídeo inválido.",
        },
        { status: 400 }
      );
    }

    const body = await file.arrayBuffer();
    const result = await uploadAcademyVideoBinaryAction({
      videoId,
      body,
      contentType: file.type || "video/mp4",
      contentLength: file.size,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : result.code === "AUTH_REQUIRED" ? 401 : 400,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        success: false,
        code: "BUNNY_UPLOAD_FAILED",
        message: message || "Não foi possível enviar o vídeo.",
      },
      { status: /autorizado|unauthor/i.test(message) ? 401 : 500 }
    );
  }
}
