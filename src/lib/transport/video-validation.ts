import {
  TRANSPORT_VIDEO_ALLOWED_MIME,
  TRANSPORT_VIDEO_MAX_BYTES,
  TRANSPORT_VIDEO_MAX_SECONDS,
  TRANSPORT_VIDEO_SOURCE_MAX_BYTES,
} from "./constants";

const FINAL_MIME = ["video/mp4", "video/webm"];
const SOURCE_MIME = [...TRANSPORT_VIDEO_ALLOWED_MIME];

export function validateTransportVideo(params: {
  mimeType?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
  fileName?: string | null;
}): { ok: true } | { ok: false; code: string; error: string } {
  if (!params.mimeType || !FINAL_MIME.includes(params.mimeType)) {
    return { ok: false, code: "TRANSPORT_VIDEO_INVALID", error: "Use MP4 ou WebM." };
  }
  if (!params.fileSize || params.fileSize <= 0 || params.fileSize > TRANSPORT_VIDEO_MAX_BYTES) {
    return {
      ok: false,
      code: "TRANSPORT_VIDEO_TOO_LARGE",
      error: `O vídeo deve ter no máximo ${Math.round(TRANSPORT_VIDEO_MAX_BYTES / (1024 * 1024))} MB.`,
    };
  }
  if (params.durationSeconds == null || Number.isNaN(params.durationSeconds) || params.durationSeconds <= 0) {
    return { ok: false, code: "TRANSPORT_VIDEO_INVALID", error: "Não foi possível ler a duração do vídeo." };
  }
  if (params.durationSeconds > TRANSPORT_VIDEO_MAX_SECONDS + 0.05) {
    return {
      ok: false,
      code: "TRANSPORT_VIDEO_TOO_LONG",
      error: `O vídeo não pode exceder ${TRANSPORT_VIDEO_MAX_SECONDS} segundos.`,
    };
  }
  const ext = (params.fileName || "").toLowerCase();
  if (ext && !/\.(mp4|webm)$/.test(ext)) {
    return { ok: false, code: "TRANSPORT_VIDEO_INVALID", error: "Utilize um ficheiro .mp4 ou .webm." };
  }
  return { ok: true };
}

export function validateTransportVideoSource(params: {
  mimeType?: string | null;
  fileSize?: number | null;
  fileName?: string | null;
}): { ok: true } | { ok: false; code: string; error: string } {
  const mime = params.mimeType || "";
  if (!SOURCE_MIME.includes(mime as (typeof SOURCE_MIME)[number]) && !mime.startsWith("video/")) {
    return { ok: false, code: "TRANSPORT_VIDEO_INVALID", error: "Formato de vídeo não suportado." };
  }
  if (!params.fileSize || params.fileSize <= 0 || params.fileSize > TRANSPORT_VIDEO_SOURCE_MAX_BYTES) {
    return {
      ok: false,
      code: "TRANSPORT_VIDEO_TOO_LARGE",
      error: "O ficheiro de vídeo é demasiado grande.",
    };
  }
  return { ok: true };
}

export function needsTransportVideoTrim(durationSeconds: number): boolean {
  return durationSeconds > TRANSPORT_VIDEO_MAX_SECONDS + 0.05;
}

export function clampTransportTrimWindow(start: number, end: number, duration: number) {
  const maxWindow = TRANSPORT_VIDEO_MAX_SECONDS;
  let safeStart = Math.max(0, start);
  let safeEnd = Math.min(duration, end);
  if (safeEnd - safeStart > maxWindow) {
    safeEnd = safeStart + maxWindow;
  }
  if (safeEnd <= safeStart) {
    safeStart = 0;
    safeEnd = Math.min(duration, maxWindow);
  }
  return { start: safeStart, end: safeEnd };
}
