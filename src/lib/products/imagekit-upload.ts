"use client";

/**
 * Direct browser upload to ImageKit. The server only ever hands over a
 * short-lived signed token/signature/expire triple (see
 * createProductVideoUploadAction) — the file bytes go straight from the
 * browser to ImageKit and never pass through the Next.js server.
 */
export interface ImageKitDirectUploadResult {
  fileId: string;
  url: string;
  thumbnailUrl: string | null;
  filePath: string;
  size: number;
}

export async function uploadToImageKit(params: {
  file: File;
  uploadUrl: string;
  publicKey: string;
  signature: string;
  token: string;
  expire: number;
  folder: string;
  signal?: AbortSignal;
}): Promise<ImageKitDirectUploadResult> {
  if (!params.publicKey || !params.signature || !params.token || !params.expire) {
    throw new Error("IMAGEKIT_UPLOAD_FAILED");
  }

  const form = new FormData();
  form.append("file", params.file);
  form.append("fileName", params.file.name || "product-video.mp4");
  form.append("publicKey", params.publicKey);
  form.append("signature", params.signature);
  form.append("token", params.token);
  form.append("expire", String(params.expire));
  form.append("folder", params.folder);
  form.append("useUniqueFileName", "true");

  const response = await fetch(params.uploadUrl, {
    method: "POST",
    body: form,
    signal: params.signal,
  });

  if (!response.ok) {
    throw new Error("IMAGEKIT_UPLOAD_FAILED");
  }

  const body = (await response.json().catch(() => null)) as {
    fileId?: string;
    url?: string;
    thumbnailUrl?: string;
    filePath?: string;
    size?: number;
  } | null;

  if (!body?.fileId || !body?.url) {
    throw new Error("IMAGEKIT_UPLOAD_FAILED");
  }

  return {
    fileId: body.fileId,
    url: body.url,
    thumbnailUrl: body.thumbnailUrl || null,
    filePath: body.filePath || "",
    size: typeof body.size === "number" ? body.size : params.file.size,
  };
}
