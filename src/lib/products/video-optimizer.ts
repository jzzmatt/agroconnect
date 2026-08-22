import { PRODUCT_VIDEO_MAX_SECONDS } from "@/config/product-catalog";
import { clampTrimWindow } from "@/lib/products/video-validation";

export type VideoOptimizeProgress =
  | "analyzing"
  | "trimming"
  | "optimizing"
  | "preparing"
  | "ready";

export type OptimizedProductVideo = {
  file: File;
  duration: number;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
  startSeconds: number;
  endSeconds: number;
};

const MAX_EDGE = 1080;
const TARGET_VIDEO_BITS = 2_400_000;
const TARGET_AUDIO_BITS = 96_000;
const PROCESS_TIMEOUT_MS = 45_000;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "video/webm";
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) return "video/webm;codecs=vp9,opus";
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) return "video/webm;codecs=vp8,opus";
  if (MediaRecorder.isTypeSupported("video/webm")) return "video/webm";
  if (MediaRecorder.isTypeSupported("video/mp4")) return "video/mp4";
  return "video/webm";
}

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("video_metadata_failed"));
    };
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("video_optimize_timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Browser-side trim + compress using Canvas + MediaRecorder.
 * Avoids shipping FFmpeg/WASM. Falls back to the original file when the
 * clip is already within limits and recording is unavailable.
 */
export async function optimizeProductVideo(
  file: File,
  options: {
    startSeconds?: number;
    endSeconds?: number;
    onProgress?: (state: VideoOptimizeProgress) => void;
    signal?: AbortSignal;
  } = {}
): Promise<OptimizedProductVideo> {
  options.onProgress?.("analyzing");
  const originalSize = file.size;
  const video = await loadVideo(file);
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const window = clampTrimWindow(
    options.startSeconds ?? 0,
    options.endSeconds ?? Math.min(duration, PRODUCT_VIDEO_MAX_SECONDS),
    duration
  );
  const clippedDuration = Math.max(0.1, window.end - window.start);

  const srcWidth = video.videoWidth || 1280;
  const srcHeight = video.videoHeight || 720;
  const scale = Math.min(1, MAX_EDGE / Math.max(srcWidth, srcHeight));
  const width = Math.max(2, Math.round((srcWidth * scale) / 2) * 2);
  const height = Math.max(2, Math.round((srcHeight * scale) / 2) * 2);

  const canRecord = typeof MediaRecorder !== "undefined" && typeof document !== "undefined";
  const alreadyShort = duration <= PRODUCT_VIDEO_MAX_SECONDS + 0.05;
  const alreadySmall = file.size <= 8 * 1024 * 1024;
  const trimRequired = !alreadyShort || window.start > 0.05 || window.end < duration - 0.05;

  if (!canRecord) {
    if (trimRequired) throw new Error("video_optimize_unsupported");
    URL.revokeObjectURL(video.src);
    return {
      file,
      duration,
      originalSize,
      optimizedSize: file.size,
      width: srcWidth,
      height: srcHeight,
      startSeconds: 0,
      endSeconds: duration,
    };
  }

  options.onProgress?.(trimRequired ? "trimming" : "optimizing");

  try {
    const optimized = await withTimeout(
      recordClip(video, {
        start: window.start,
        duration: clippedDuration,
        width,
        height,
        signal: options.signal,
      }),
      PROCESS_TIMEOUT_MS
    );
    URL.revokeObjectURL(video.src);
    options.onProgress?.("ready");
    return {
      file: optimized,
      duration: clippedDuration,
      originalSize,
      optimizedSize: optimized.size,
      width,
      height,
      startSeconds: window.start,
      endSeconds: window.end,
    };
  } catch (error) {
    URL.revokeObjectURL(video.src);
    if (!trimRequired && alreadySmall) {
      return {
        file,
        duration,
        originalSize,
        optimizedSize: file.size,
        width: srcWidth,
        height: srcHeight,
        startSeconds: 0,
        endSeconds: duration,
      };
    }
    throw error;
  }
}

async function recordClip(
  video: HTMLVideoElement,
  params: { start: number; duration: number; width: number; height: number; signal?: AbortSignal }
): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = params.width;
  canvas.height = params.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("video_optimize_failed");

  const stream = canvas.captureStream(24);
  const audioTracks = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.()?.getAudioTracks?.() || [];
  for (const track of audioTracks) stream.addTrack(track);

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: TARGET_VIDEO_BITS,
    audioBitsPerSecond: TARGET_AUDIO_BITS,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  video.currentTime = params.start;
  await new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.onerror = () => reject(new Error("video_seek_failed"));
  });

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(";")[0] }));
    recorder.onerror = () => reject(new Error("video_optimize_failed"));
  });

  recorder.start(250);
  await video.play();

  await new Promise<void>((resolve, reject) => {
    const started = performance.now();
    const tick = () => {
      if (params.signal?.aborted) {
        recorder.stop();
        video.pause();
        reject(new Error("video_optimize_cancelled"));
        return;
      }
      ctx.drawImage(video, 0, 0, params.width, params.height);
      const elapsed = (performance.now() - started) / 1000;
      if (elapsed >= params.duration || video.currentTime >= params.start + params.duration || video.ended) {
        video.pause();
        if (recorder.state !== "inactive") recorder.stop();
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const blob = await stopped;
  for (const track of stream.getTracks()) track.stop();
  const extension = mimeType.includes("mp4") ? "mp4" : "webm";
  return new File([blob], `product-video.${extension}`, { type: blob.type || `video/${extension}` });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatClock(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
