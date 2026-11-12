"use client";

import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { PRODUCT_VIDEO_MAX_SECONDS } from "@/config/product-catalog";

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

let runner: Promise<FFmpeg> | null = null;

async function loadRunner(): Promise<FFmpeg> {
  if (runner) return runner;
  const pending = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");
    const ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    return ffmpeg;
  })().catch((error: unknown) => {
    runner = null;
    throw error;
  });
  runner = pending;
  return pending;
}

function outputName(file: File): { input: string; output: string; mime: string } {
  const webm = file.type === "video/webm" || file.name.toLowerCase().endsWith(".webm");
  return webm
    ? { input: "input.webm", output: "output.webm", mime: "video/webm" }
    : { input: "input.mp4", output: "output.mp4", mime: "video/mp4" };
}

/** Keep the first 60 seconds. The single-thread core is loaded from unpkg. */
export async function trimProductVideoToFirstMinute(file: File): Promise<File> {
  const ffmpeg = await loadRunner();
  const { fetchFile } = await import("@ffmpeg/util");
  const names = outputName(file);
  await ffmpeg.writeFile(names.input, await fetchFile(file));
  const code = await ffmpeg.exec(["-ss", "0", "-t", String(PRODUCT_VIDEO_MAX_SECONDS), "-i", names.input, "-c", "copy", names.output]);
  const data = code === 0 ? await ffmpeg.readFile(names.output) : null;
  await ffmpeg.deleteFile(names.input).catch(() => undefined);
  await ffmpeg.deleteFile(names.output).catch(() => undefined);
  if (code !== 0 || !data || typeof data === "string") {
    throw Object.assign(new Error("PRODUCT_VIDEO_INVALID"), { code: "PRODUCT_VIDEO_INVALID" });
  }
  const base = file.name.replace(/\.[^.]+$/, "") || "product-video";
  const bytes = data instanceof Uint8Array ? data : new Uint8Array();
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new File([copy], `${base}.${names.mime === "video/webm" ? "webm" : "mp4"}`, { type: names.mime });
}
