import { NextResponse } from "next/server";
import { createAcademyVideoUploadAction } from "@/lib/services/academy-video-actions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await createAcademyVideoUploadAction({
      title: String(body?.title || "aula-agriacademy"),
      filename: String(body?.filename || body?.fileName || "video.mp4"),
      mimeType: String(body?.mimeType || "video/mp4"),
      fileSize: Number(body?.fileSize || 0),
      courseId: body?.courseId ? String(body.courseId) : undefined,
    });

    if (!result.upload.configured) {
      return NextResponse.json(
        {
          success: false,
          code: result.upload.code || "BUNNY_NOT_CONFIGURED",
          message: result.upload.error || "Infraestrutura Bunny Stream não configurada.",
          video: result.video,
          upload: result.upload,
        },
        { status: 400 }
      );
    }

    if (
      !result.upload.bunnyVideoId ||
      !result.upload.bunnyLibraryId ||
      !result.upload.authorizationSignature ||
      !result.upload.authorizationExpire
    ) {
      return NextResponse.json(
        {
          success: false,
          code: result.upload.code || "BUNNY_UPLOAD_FAILED",
          message: result.upload.error || "Não foi possível autorizar o carregamento.",
          video: result.video,
          upload: result.upload,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      video: result.video,
      upload: result.upload,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        success: false,
        code: "BUNNY_UPLOAD_FAILED",
        message: message || "Não foi possível iniciar o carregamento.",
      },
      { status: /autorizado|unauthor/i.test(message) ? 401 : 500 }
    );
  }
}
