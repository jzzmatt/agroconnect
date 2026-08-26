"use client";

import * as tus from "tus-js-client";
import { BUNNY_TUS_ENDPOINT } from "@/lib/video/bunny-constants";

function normalizeLibraryId(value: string | number | null | undefined): string {
  const libraryId = String(value ?? "").trim();
  if (!/^\d+$/.test(libraryId)) {
    throw Object.assign(new Error("BUNNY_LIBRARY_ID_INVALID"), {
      code: "BUNNY_LIBRARY_ID_INVALID",
    });
  }
  return libraryId;
}

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
  const libraryId = normalizeLibraryId(params.libraryId);
  const videoId = String(params.videoId || "").trim();
  const expire = Number(params.expire);
  const signature = String(params.signature || "").trim();

  if (!videoId || !signature || !Number.isFinite(expire)) {
    throw Object.assign(new Error("BUNNY_UPLOAD_FAILED"), { code: "BUNNY_UPLOAD_FAILED" });
  }

  const applyBunnyHeaders = (req: { setHeader: (name: string, value: string) => void }) => {
    req.setHeader("AuthorizationSignature", signature);
    req.setHeader("AuthorizationExpire", String(expire));
    req.setHeader("VideoId", videoId);
    req.setHeader("LibraryId", libraryId);
  };

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(params.file, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
      chunkSize: 5 * 1024 * 1024,
      removeFingerprintOnSuccess: true,
      fingerprint: (file) =>
        Promise.resolve(
          `bunny:${videoId}:${file.name}:${file.size}:${file.lastModified}:${file.type || "video/mp4"}`
        ),
      metadata: {
        filetype: params.file.type || "video/mp4",
        title: params.file.name || "academy-video",
      },
      onBeforeRequest: applyBunnyHeaders,
      onProgress(bytesUploaded, bytesTotal) {
        if (bytesTotal > 0) {
          params.onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
        }
      },
      onError(error) {
        console.warn("[bunny tus]", error?.message || error);
        const message = String(error?.message || "");
        if (/library id missing or invalid/i.test(message)) {
          reject(
            Object.assign(new Error("BUNNY_LIBRARY_ID_INVALID"), {
              code: "BUNNY_LIBRARY_ID_INVALID",
            })
          );
          return;
        }
        reject(
          error instanceof Error
            ? Object.assign(error, { code: "BUNNY_UPLOAD_FAILED" })
            : Object.assign(new Error("BUNNY_UPLOAD_FAILED"), { code: "BUNNY_UPLOAD_FAILED" })
        );
      },
      onSuccess() {
        resolve(true);
      },
    });

    const onAbort = () => {
      void upload.abort(true).catch(() => undefined);
      reject(Object.assign(new Error("BUNNY_UPLOAD_FAILED"), { code: "BUNNY_UPLOAD_FAILED" }));
    };
    params.signal?.addEventListener("abort", onAbort, { once: true });

    void (async () => {
      try {
        const previousUploads = await upload.findPreviousUploads();
        const scoped = previousUploads.find((entry) => entry.uploadUrl?.includes(videoId));
        if (scoped) {
          upload.resumeFromPreviousUpload(scoped);
        }
        upload.start();
      } catch (error) {
        reject(
          error instanceof Error
            ? Object.assign(error, { code: "BUNNY_UPLOAD_FAILED" })
            : Object.assign(new Error("BUNNY_UPLOAD_FAILED"), { code: "BUNNY_UPLOAD_FAILED" })
        );
      }
    })();
  });
}
