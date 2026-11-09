import { planLessonVideoUpload, LESSON_VIDEO_CHUNK_BYTES } from "@/lib/academy/lesson-video-chunks";
import type { CourseLessonRecord } from "@/types/agriacademy";

function uploadForm(
  url: string,
  form: FormData,
  onProgress: (percent: number) => void
): Promise<{ ok: boolean; status: number; payload: { success?: boolean; code?: string; lesson?: CourseLessonRecord } | null }> {
  return new Promise((resolve, reject) => {
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

function requestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `lesson${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export async function uploadLessonVideoWithProgress(params: {
  lessonId: string;
  file: File;
  mimeType: string;
  durationSeconds?: number | null;
  onProgress?: (loaded: number, total: number) => void;
}): Promise<CourseLessonRecord> {
  const plan = planLessonVideoUpload(params.file.size);
  const clientRequestId = requestId();
  const report = (completedBytes: number) => {
    params.onProgress?.(Math.min(params.file.size, completedBytes), params.file.size);
  };

  for (let index = 0; index < plan.total; index += 1) {
    const start = index * LESSON_VIDEO_CHUNK_BYTES;
    const slice = params.file.slice(start, start + LESSON_VIDEO_CHUNK_BYTES);
    const form = new FormData();
    form.append("clientRequestId", clientRequestId);
    form.append("index", String(index));
    form.append("total", String(plan.total));
    form.append("fileSize", String(params.file.size));
    form.append("fileName", params.file.name || "lesson-video.mp4");
    form.append("mimeType", params.mimeType);
    form.append("file", slice, params.file.name || "lesson-video.mp4");
    const result = await uploadForm(
      `/api/academy/lessons/${params.lessonId}/video/upload/chunk`,
      form,
      (percent) => report(start + Math.round((slice.size * percent) / 100))
    );
    if (!result.ok || !result.payload?.success) {
      const code = result.status === 413 ? "VIDEO_FILE_TOO_LARGE" : result.payload?.code || "UPLOAD_FAILED";
      throw Object.assign(new Error(code), { code });
    }
    report(start + slice.size);
  }

  params.onProgress?.(params.file.size, params.file.size);
  const durationSeconds =
    params.durationSeconds !== undefined ? params.durationSeconds : await readLessonVideoDuration(params.file);
  const complete = await fetch(`/api/academy/lessons/${params.lessonId}/video/upload/chunk/complete`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientRequestId,
      total: plan.total,
      fileSize: params.file.size,
      fileName: params.file.name || "lesson-video.mp4",
      mimeType: params.mimeType,
      durationSeconds,
    }),
  });
  let payload: { success?: boolean; code?: string; lesson?: CourseLessonRecord } | null = null;
  try {
    payload = await complete.json();
  } catch {
    payload = null;
  }
  if (!complete.ok || !payload?.success || !payload.lesson) {
    const code = payload?.code || "UPLOAD_FAILED";
    throw Object.assign(new Error(code), { code });
  }
  return payload.lesson;
}

function readLessonVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 2000);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      clearTimeout(timer);
      const duration = video.duration;
      finish(Number.isFinite(duration) && duration > 0 ? duration : null);
    };
    video.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    video.src = url;
  });
}
