"use client";

import { planTempVideoUpload, TEMP_VIDEO_CHUNK_BYTES } from "@/lib/products/temp-video-chunks";

function uploadChunk(url: string, form: FormData, onProgress: (percent: number) => void) {
  return new Promise<{ ok: boolean; status: number; payload: { success?: boolean; code?: string; video?: { id?: string } } | null }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
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

/** Same chunked save used for a product video, stored on this service. */
export async function uploadServiceVideo(params: {
  serviceId: string;
  file: File;
  clientRequestId: string;
  durationSeconds: number;
  onProgress: (percent: number) => void;
}): Promise<{ id: string }> {
  const plan = planTempVideoUpload(params.file.size);
  const steps = plan.total + 1;
  const report = (step: number, partPercent: number) => {
    params.onProgress(Math.min(99, Math.round(((step + partPercent / 100) / steps) * 100)));
  };
  for (let index = 0; index < plan.total; index += 1) {
    const start = index * TEMP_VIDEO_CHUNK_BYTES;
    const slice = params.file.slice(start, start + TEMP_VIDEO_CHUNK_BYTES);
    const form = new FormData();
    form.append("clientRequestId", params.clientRequestId);
    form.append("index", String(index));
    form.append("total", String(plan.total));
    form.append("fileSize", String(params.file.size));
    form.append("mimeType", params.file.type || "video/webm");
    form.append("file", slice, params.file.name || "service-video.webm");
    const result = await uploadChunk(`/api/services/${params.serviceId}/video/chunk`, form, (percent) => report(index, percent));
    if (!result.ok || !result.payload?.success) {
      const code = result.status === 413 ? "PRODUCT_VIDEO_TOO_LARGE" : result.payload?.code || "TEMP_VIDEO_FAILED";
      throw Object.assign(new Error(code), { code });
    }
  }
  const complete = await fetch(`/api/services/${params.serviceId}/video/complete`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRequestId: params.clientRequestId,
      total: plan.total,
      fileSize: params.file.size,
      mimeType: params.file.type || "video/webm",
      durationSeconds: params.durationSeconds,
      fileName: params.file.name,
    }),
  });
  const payload = await complete.json().catch(() => null);
  if (!complete.ok || !payload?.success || !payload.video?.id) {
    throw Object.assign(new Error(payload?.code || "TEMP_VIDEO_FAILED"), { code: payload?.code || "TEMP_VIDEO_FAILED" });
  }
  params.onProgress(100);
  return { id: payload.video.id };
}
