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
    form.append("part", "video");
    form.append("clientRequestId", params.clientRequestId);
    form.append("index", String(index));
    form.append("total", String(plan.total));
    form.append("fileSize", String(params.file.size));
    form.append("mimeType", params.file.type || "video/webm");
    form.append("file", slice, params.file.name || "product-video.webm");
    const result = await uploadForm(form, (percent) => report(index, percent));
    if (!result.ok || !result.payload?.success) {
      const code = result.status === 413 ? "PRODUCT_VIDEO_TOO_LARGE" : result.payload?.code || "TEMP_VIDEO_FAILED";
      throw Object.assign(new Error(code), { code });
    }
  }

  params.onProgress(Math.min(99, Math.round((plan.total / steps) * 100)));
  const complete = await fetch("/api/products/video/temp/chunk/complete", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRequestId: params.clientRequestId,
      total: plan.total,
      fileSize: params.file.size,
      mimeType: params.file.type || "video/webm",
      durationSeconds: params.durationSeconds,
    }),
  });
  let payload: { success?: boolean; code?: string; video?: { id?: string } } | null = null;
  try {
    payload = await complete.json();
  } catch {
    payload = null;
  }
  if (!complete.ok || !payload?.success || !payload.video?.id) {
    const code = payload?.code || "TEMP_VIDEO_FAILED";
    throw Object.assign(new Error(code), { code });
  }
  params.onProgress(100);
  return { id: payload.video.id };
}

export function uploadGeneratedThumbnail(params: {
  tempId: string;
  frame: File;
  productTitle: string;
  onProgress: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("tempId", params.tempId);
    form.append("productTitle", params.productTitle);
    form.append("file", params.frame, "frame.jpg");
    xhr.open("POST", "/api/products/video/temp/thumbnail");
    xhr.withCredentials = true;
    let waiting = 45;
    const timer = setInterval(() => {
      waiting = Math.min(90, waiting + 3);
      params.onProgress(waiting);
    }, 500);
    const finish = (error?: Error) => {
      clearInterval(timer);
      if (error) reject(error);
    };
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        params.onProgress(Math.min(40, Math.round((event.loaded / event.total) * 40)));
      }
    };
    xhr.onload = () => {
      clearInterval(timer);
      let payload: { success?: boolean; code?: string } | null = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload?.success) {
        params.onProgress(100);
        resolve();
        return;
      }
      const code = payload?.code || "THUMBNAIL_GENERATION_FAILED";
      finish(Object.assign(new Error(code), { code }));
    };
    xhr.onerror = () => finish(Object.assign(new Error("NETWORK_FAILED"), { code: "NETWORK_FAILED" }));
    xhr.onabort = () => finish(Object.assign(new Error("THUMBNAIL_GENERATION_CANCELLED"), { code: "THUMBNAIL_GENERATION_CANCELLED" }));
    params.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}
