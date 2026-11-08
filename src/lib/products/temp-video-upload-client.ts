"use client";

import { planTempVideoUpload, TEMP_VIDEO_CHUNK_BYTES } from "@/lib/products/temp-video-chunks";

function uploadForm(
  form: FormData,
  onProgress: (percent: number) => void
): Promise<{ ok: boolean; status: number; payload: { success?: boolean; code?: string; video?: { id?: string } } | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/products/video/temp/chunk");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let payload = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = null;
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, payload });
    };
    xhr.onerror = () => reject(Object.assign(new Error("NETWORK_FAILED"), { code: "NETWORK_FAILED" }));
    xhr.send(form);
  });
}

export async function uploadProcessedTempVideo(params: {
  file: File;
  thumbnail: File;
  clientRequestId: string;
  durationSeconds: number;
  onProgress: (percent: number) => void;
}): Promise<{ id: string }> {
  if (params.thumbnail.size <= 0 || params.thumbnail.size > 3_500_000) {
    throw Object.assign(new Error("THUMBNAIL_FAILED"), { code: "THUMBNAIL_FAILED" });
  }
  const plan = planTempVideoUpload(params.file.size);
  const steps = plan.total + 1;
  const report = (step: number, partPercent: number) => {
    params.onProgress(Math.min(99, Math.round(((step + partPercent / 100) / steps) * 100)));
  };

  const thumbnailForm = new FormData();
  thumbnailForm.append("part", "thumbnail");
  thumbnailForm.append("clientRequestId", params.clientRequestId);
  thumbnailForm.append("file", params.thumbnail, "thumbnail.jpg");
  const thumbnailResult = await uploadForm(thumbnailForm, (percent) => report(0, percent));
  if (!thumbnailResult.ok || !thumbnailResult.payload?.success) {
    const code = thumbnailResult.status === 413 ? "PRODUCT_VIDEO_TOO_LARGE" : thumbnailResult.payload?.code || "THUMBNAIL_UPLOAD_FAILED";
    throw Object.assign(new Error(code), { code });
  }

  let videoId = "";
  for (let index = 0; index < plan.total; index += 1) {
    const start = index * TEMP_VIDEO_CHUNK_BYTES;
    const slice = params.file.slice(start, start + TEMP_VIDEO_CHUNK_BYTES);
    const form = new FormData();
    form.append("part", "video");
    form.append("clientRequestId", params.clientRequestId);
    form.append("index", String(index));
    form.append("total", String(plan.total));
    form.append("fileSize", String(params.file.size));
    form.append("mimeType", params.file.type || "video/webm");
    form.append("file", slice, params.file.name || "product-video.webm");
    if (index === plan.total - 1) {
      form.append("durationSeconds", String(params.durationSeconds));
    }
    const result = await uploadForm(form, (percent) => report(index + 1, percent));
    if (!result.ok || !result.payload?.success) {
      const code = result.status === 413 ? "PRODUCT_VIDEO_TOO_LARGE" : result.payload?.code || "TEMP_VIDEO_FAILED";
      throw Object.assign(new Error(code), { code });
    }
    if (result.payload.video?.id) videoId = result.payload.video.id;
  }
  if (!videoId) throw Object.assign(new Error("TEMP_VIDEO_FAILED"), { code: "TEMP_VIDEO_FAILED" });
  params.onProgress(100);
  return { id: videoId };
}
