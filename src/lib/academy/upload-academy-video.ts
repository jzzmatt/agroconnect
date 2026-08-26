"use client";

const TUS_FALLBACK_BYTES = 200 * 1024 * 1024;

export function shouldUseServerBunnyUpload(fileSize: number): boolean {
  return fileSize <= TUS_FALLBACK_BYTES;
}

export function uploadAcademyVideoWithProgress(params: {
  videoId: string;
  file: File;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}): Promise<{ success: boolean; code?: string; message?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("videoId", params.videoId);
    form.append("file", params.file);

    xhr.open("POST", "/api/academy/video/upload");
    xhr.withCredentials = true;
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      params.onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      const payload = xhr.response as { success?: boolean; code?: string; message?: string } | null;
      if (xhr.status >= 200 && xhr.status < 300 && payload?.success) {
        resolve({ success: true });
        return;
      }
      resolve({
        success: false,
        code: payload?.code || "BUNNY_UPLOAD_FAILED",
        message: payload?.message,
      });
    };

    xhr.onerror = () => {
      reject(Object.assign(new Error("BUNNY_UPLOAD_FAILED"), { code: "BUNNY_UPLOAD_FAILED" }));
    };

    xhr.onabort = () => {
      reject(Object.assign(new Error("BUNNY_UPLOAD_FAILED"), { code: "BUNNY_UPLOAD_FAILED" }));
    };

    params.signal?.addEventListener(
      "abort",
      () => {
        xhr.abort();
      },
      { once: true }
    );

    xhr.send(form);
  });
}
