"use client";

import { computeBunnyUiProgress, type UploadProgressPhase } from "@/lib/academy/upload-progress";
import { getAcademyVideoUploadStatusAction } from "@/lib/services/academy-video-actions";

const POLL_INTERVAL_MS = 1000;
const MAX_WAIT_MS = 10 * 60 * 1000;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(Object.assign(new Error("UPLOAD_ABORTED"), { code: "UPLOAD_ABORTED" }));
      },
      { once: true }
    );
  });
}

export async function waitForAcademyVideoReady(params: {
  videoId: string;
  getTransferPercent: () => number;
  signal?: AbortSignal;
  onProgress: (percent: number, phase: UploadProgressPhase) => void;
}): Promise<void> {
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    if (params.signal?.aborted) {
      throw Object.assign(new Error("UPLOAD_ABORTED"), { code: "UPLOAD_ABORTED" });
    }

    const result = await getAcademyVideoUploadStatusAction(params.videoId);
    if (!result.ok) {
      throw Object.assign(new Error(result.code), { code: result.code });
    }

    const { percent, phase } = computeBunnyUiProgress({
      transferPercent: params.getTransferPercent(),
      bunnyStatusCode: result.bunnyStatusCode,
      encodeProgress: result.encodeProgress,
    });
    params.onProgress(percent, phase);

    if (result.ready) return;
    if (result.failed) {
      throw Object.assign(new Error("BUNNY_UPLOAD_FAILED"), { code: "BUNNY_UPLOAD_FAILED" });
    }

    await sleep(POLL_INTERVAL_MS, params.signal);
  }

  throw Object.assign(new Error("BUNNY_UPLOAD_TIMEOUT"), { code: "BUNNY_UPLOAD_TIMEOUT" });
}
