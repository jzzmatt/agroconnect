/**
 * ImageKit integration — canonical provider for product images, product short
 * videos, and (in a later phase) profile/application images and thumbnails.
 *
 * Implemented with raw fetch + node:crypto (no vendor SDK), consistent with
 * how @/lib/video/bunny.ts talks to Bunny Stream. The private key never
 * leaves this module; only short-lived signed upload parameters are handed
 * to the browser for direct uploads.
 *
 * Required environment variables:
 * - IMAGEKIT_PRIVATE_KEY        Server-only private API key
 * - IMAGEKIT_PUBLIC_KEY         Public key, safe to send to the browser
 * - IMAGEKIT_URL_ENDPOINT       e.g. https://ik.imagekit.io/your_imagekit_id
 */

import { createHmac, randomUUID } from "node:crypto";

export const IMAGEKIT_UPLOAD_ENDPOINT = "https://upload.imagekit.io/api/v1/files/upload";
const IMAGEKIT_API_BASE = "https://api.imagekit.io/v1";

function trimEnv(value?: string | null): string {
  return String(value || "").trim();
}

export function getImageKitConfig() {
  return {
    privateKey: trimEnv(process.env.IMAGEKIT_PRIVATE_KEY),
    publicKey: trimEnv(process.env.IMAGEKIT_PUBLIC_KEY),
    urlEndpoint: trimEnv(process.env.IMAGEKIT_URL_ENDPOINT).replace(/\/$/, ""),
  };
}

export function isImageKitConfigured(): boolean {
  const config = getImageKitConfig();
  return Boolean(config.privateKey && config.publicKey && config.urlEndpoint);
}

export interface ImageKitUploadAuth {
  configured: boolean;
  token: string | null;
  signature: string | null;
  expire: number | null;
  publicKey: string | null;
  uploadUrl: string | null;
  folder: string;
  error?: string;
  code?: "IMAGEKIT_NOT_CONFIGURED";
}

/**
 * Signature scheme per ImageKit's client-side upload API: lowercase hex
 * HMAC-SHA1 of `token + expire`, keyed with the private API key. Computed
 * here on the server; the private key is never sent to the browser.
 */
export function createImageKitUploadAuth(params: { folder: string }): ImageKitUploadAuth {
  const config = getImageKitConfig();
  if (!config.privateKey || !config.publicKey || !config.urlEndpoint) {
    return {
      configured: false,
      token: null,
      signature: null,
      expire: null,
      publicKey: null,
      uploadUrl: null,
      folder: params.folder,
      code: "IMAGEKIT_NOT_CONFIGURED",
      error: "Infraestrutura ImageKit ainda não configurada neste ambiente.",
    };
  }

  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 60 * 30; // 30 minutes
  const signature = createHmac("sha1", config.privateKey)
    .update(`${token}${expire}`)
    .digest("hex");

  return {
    configured: true,
    token,
    signature,
    expire,
    publicKey: config.publicKey,
    uploadUrl: IMAGEKIT_UPLOAD_ENDPOINT,
    folder: params.folder,
  };
}

export interface ImageKitUploadResult {
  configured: boolean;
  fileId: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  filePath: string | null;
  fileSize: number | null;
  error?: string;
  code?: "IMAGEKIT_NOT_CONFIGURED" | "IMAGEKIT_UPLOAD_FAILED";
}

/**
 * Server-side upload for flows that already hold the bytes on the server
 * (e.g. the product image route, which receives multipart form data and has
 * no reason to round-trip a second signed request to the browser). Uses
 * Basic Auth with the private key, exactly as ImageKit's server-side upload
 * API expects.
 */
export async function uploadBufferToImageKit(params: {
  buffer: Buffer;
  fileName: string;
  folder: string;
  useUniqueFileName?: boolean;
}): Promise<ImageKitUploadResult> {
  const config = getImageKitConfig();
  if (!config.privateKey || !config.urlEndpoint) {
    return {
      configured: false,
      fileId: null,
      url: null,
      thumbnailUrl: null,
      filePath: null,
      fileSize: null,
      code: "IMAGEKIT_NOT_CONFIGURED",
      error: "Infraestrutura ImageKit ainda não configurada neste ambiente.",
    };
  }

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(params.buffer)]), params.fileName);
  form.append("fileName", params.fileName);
  form.append("folder", params.folder);
  form.append("useUniqueFileName", params.useUniqueFileName === false ? "false" : "true");

  const response = await fetch(IMAGEKIT_UPLOAD_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.privateKey}:`).toString("base64")}`,
    },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.warn("[imagekit] upload failed", response.status, detail.slice(0, 400));
    return {
      configured: true,
      fileId: null,
      url: null,
      thumbnailUrl: null,
      filePath: null,
      fileSize: null,
      code: "IMAGEKIT_UPLOAD_FAILED",
      error: "Não foi possível carregar o ficheiro para o ImageKit.",
    };
  }

  const uploaded = (await response.json()) as {
    fileId?: string;
    url?: string;
    thumbnailUrl?: string;
    filePath?: string;
    size?: number;
  };

  return {
    configured: true,
    fileId: uploaded.fileId || null,
    url: uploaded.url || null,
    thumbnailUrl: uploaded.thumbnailUrl || null,
    filePath: uploaded.filePath || null,
    fileSize: typeof uploaded.size === "number" ? uploaded.size : null,
  };
}

export async function deleteImageKitFile(fileId: string): Promise<boolean> {
  const config = getImageKitConfig();
  if (!config.privateKey || !fileId) return false;
  try {
    const response = await fetch(`${IMAGEKIT_API_BASE}/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.privateKey}:`).toString("base64")}`,
      },
    });
    return response.ok || response.status === 404;
  } catch (error) {
    console.warn("[imagekit] delete failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

/** Deterministic, collision-resistant folder path for a product's media. */
export function productMediaFolder(productId: string, kind: "images" | "videos"): string {
  return `/agriconnect/products/${productId}/${kind}`;
}
