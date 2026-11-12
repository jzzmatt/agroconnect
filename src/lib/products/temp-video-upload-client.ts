"use client";

function putSignedFile(
  signedUrl: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(Object.assign(new Error("TEMP_VIDEO_FAILED"), { code: "TEMP_VIDEO_FAILED" }));
    };
    xhr.onerror = () => reject(Object.assign(new Error("NETWORK_FAILED"), { code: "NETWORK_FAILED" }));
    xhr.send(body);
  });
}

export async function uploadProcessedTempVideo(params: {
  file: File;
  clientRequestId: string;
  durationSeconds: number;
  onProgress: (percent: number) => void;
  onPhase?: (phase: "uploading" | "saving") => void;
}): Promise<{ id: string }> {
  const mimeType = params.file.type === "video/webm" || params.file.name.toLowerCase().endsWith(".webm")
    ? "video/webm"
    : "video/mp4";
  params.onPhase?.("uploading");
  const prepared = await fetch("/api/products/video/temp/direct", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRequestId: params.clientRequestId,
      fileSize: params.file.size,
      mimeType,
      durationSeconds: params.durationSeconds,
    }),
  });
  let start: {
    success?: boolean;
    code?: string;
    alreadySaved?: boolean;
    video?: { id?: string };
    upload?: { signedUrl?: string };
  } | null = null;
  try {
    start = await prepared.json();
  } catch {
    start = null;
  }
  if (!prepared.ok || !start?.success || !start.video?.id) {
    throw Object.assign(new Error(start?.code || "TEMP_VIDEO_FAILED"), { code: start?.code || "TEMP_VIDEO_FAILED" });
  }
  if (start.alreadySaved) {
    params.onProgress(100);
    return { id: start.video.id };
  }
  if (!start.upload?.signedUrl) {
    throw Object.assign(new Error("TEMP_VIDEO_FAILED"), { code: "TEMP_VIDEO_FAILED" });
  }
  await putSignedFile(start.upload.signedUrl, params.file, params.onProgress);

  params.onPhase?.("saving");
  const complete = await fetch("/api/products/video/temp/direct/complete", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRequestId: params.clientRequestId,
      fileSize: params.file.size,
    }),
  });
  let payload: { success?: boolean; code?: string; video?: { id?: string } } | null = null;
  try {
    payload = await complete.json();
  } catch {
    payload = null;
  }
  if (!complete.ok || !payload?.success || !payload.video?.id) {
    throw Object.assign(new Error(payload?.code || "TEMP_VIDEO_FAILED"), { code: payload?.code || "TEMP_VIDEO_FAILED" });
  }
  params.onProgress(100);
  return { id: payload.video.id };
}

export async function confirmSavedTempVideo(tempId: string): Promise<string | null> {
  const response = await fetch("/api/products/video/temp/status", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tempId }),
  });
  let payload: { confirmed?: boolean; video?: { id?: string } } | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok || !payload?.confirmed || payload.video?.id !== tempId) return null;
  return payload.video.id;
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
