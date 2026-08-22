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
}): Promise<boolean> {
  const endpoint = params.uploadUrl || BUNNY_TUS_ENDPOINT;
  const libraryId = String(params.libraryId || "");
  const videoId = String(params.videoId || "");
  const expire = String(params.expire);

  if (!libraryId || !videoId || !params.signature || !expire) {
    throw new Error("BUNNY_UPLOAD_FAILED");
  }

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(params.file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: 5 * 1024 * 1024,
      removeFingerprintOnSuccess: true,
      headers: {
        AuthorizationSignature: params.signature,
        AuthorizationExpire: expire,
        VideoId: videoId,
        LibraryId: libraryId,
      },
      metadata: {
        filetype: params.file.type || "video/webm",
        title: params.file.name || "product-video",
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
    upload.start();
  });
}
