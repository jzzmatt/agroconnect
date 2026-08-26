"use client";

import * as tus from "tus-js-client";
import { BUNNY_TUS_ENDPOINT } from "@/lib/video/bunny-constants";

export async function uploadToBunnyTus(params: {
  file: File;
  uploadUrl: string;
  libraryId: string;
  videoId: string;
  signature: string;
  expire: number;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}): Promise<boolean> {
  const endpoint = params.uploadUrl || BUNNY_TUS_ENDPOINT;
  const libraryId = String(params.libraryId || "");
  const videoId = String(params.videoId || "");
  const expire = Number(params.expire);

  if (!libraryId || !videoId || !params.signature || !Number.isFinite(expire)) {
    throw new Error("BUNNY_UPLOAD_FAILED");
  }

  const authHeaders = {
    AuthorizationSignature: params.signature,
    AuthorizationExpire: String(expire),
    VideoId: videoId,
    LibraryId: libraryId,
  };

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(params.file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
      chunkSize: 5 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      fingerprint: (file) =>
        Promise.resolve(
          `bunny:${videoId}:${file.name}:${file.size}:${file.lastModified}:${file.type || "video/mp4"}`
        ),
      headers: authHeaders,
      metadata: {
        filetype: params.file.type || "video/mp4",
        title: params.file.name || "academy-video",
      },
      onBeforeRequest(req) {
        for (const [key, value] of Object.entries(authHeaders)) {
          req.setHeader(key, value);
        }
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (bytesTotal > 0) {
          params.onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
        }
      },
      onError(error) {
        console.warn("[bunny tus]", error?.message || error);
        reject(error instanceof Error ? error : new Error("BUNNY_UPLOAD_FAILED"));
      },
      onSuccess() {
        resolve(true);
      },
    });

    const onAbort = () => {
      void upload.abort(true).catch(() => undefined);
      reject(new Error("BUNNY_UPLOAD_FAILED"));
    };
    params.signal?.addEventListener("abort", onAbort, { once: true });

    void (async () => {
      try {
        // Never resume a previous upload for a different Bunny video object.
        const previousUploads = await upload.findPreviousUploads();
        const scoped = previousUploads.find((entry) => entry.uploadUrl?.includes(videoId));
        if (scoped) {
          upload.resumeFromPreviousUpload(scoped);
        }
        upload.start();
      } catch (error) {
        reject(error instanceof Error ? error : new Error("BUNNY_UPLOAD_FAILED"));
      }
    })();
  });
}
