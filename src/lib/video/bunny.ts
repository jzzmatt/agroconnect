/**
 * Bunny Stream integration for AgriAcademy and AgriProduct videos.
 * Credentials stay on the server. The browser never receives private API keys.
 *
 * Required environment variables:
 * - BUNNY_STREAM_API_KEY        Stream *library* API key (not the account key)
 * - BUNNY_STREAM_LIBRARY_ID     Numeric Stream library ID
 * - BUNNY_STREAM_CDN_HOSTNAME   Pull zone host, e.g. vz-xxxxx.b-cdn.net
 * - BUNNY_STREAM_WEBHOOK_SECRET Optional shared secret for /api/webhooks/bunny
 */

import { createHash } from "node:crypto";
import {
  BUNNY_EMBED_HOST,
  BUNNY_STREAM_API,
  BUNNY_TUS_ENDPOINT,
} from "@/lib/video/bunny-constants";

export { BUNNY_EMBED_HOST, BUNNY_STREAM_API, BUNNY_TUS_ENDPOINT };

export type BunnyVideoStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "ready"
  | "failed"
  | "deleted";

function trimEnv(value?: string | null): string {
  return String(value || "").trim();
}

/**
 * Bunny library IDs are numeric. The library API key is a UUID-like token.
 * If those two env values are reversed, Stream returns 400 on create.
 */
export function normalizeBunnyCredentials(apiKey: string, libraryId: string) {
  const key = trimEnv(apiKey);
  const library = trimEnv(libraryId);
  const keyIsNumeric = /^\d+$/.test(key);
  const libraryLooksLikeKey = /[A-Za-z]/.test(library) && library.includes("-");
  if (keyIsNumeric && libraryLooksLikeKey) {
    return { apiKey: library, libraryId: key, swapped: true as const };
  }
  return { apiKey: key, libraryId: library, swapped: false as const };
}

export function getBunnyConfig() {
  const normalized = normalizeBunnyCredentials(
    process.env.BUNNY_STREAM_API_KEY || "",
    process.env.BUNNY_STREAM_LIBRARY_ID || ""
  );
  if (normalized.swapped) {
    console.warn(
      "[bunny] BUNNY_STREAM_API_KEY and BUNNY_STREAM_LIBRARY_ID were reversed; using the numeric value as Library ID."
    );
  }
  return {
    apiKey: normalized.apiKey,
    libraryId: normalized.libraryId,
    cdnHostname: trimEnv(process.env.BUNNY_STREAM_CDN_HOSTNAME).replace(/^https?:\/\//, ""),
    webhookSecret: trimEnv(process.env.BUNNY_STREAM_WEBHOOK_SECRET),
  };
}

export function isBunnyConfigured(): boolean {
  const config = getBunnyConfig();
  return Boolean(config.apiKey && config.libraryId);
}

export function getBunnyEmbedUrl(libraryId: string, videoId: string): string {
  return `${BUNNY_EMBED_HOST}/embed/${libraryId}/${videoId}`;
}

export function getBunnyPlaybackUrl(libraryId: string, videoId: string): string {
  const host = getBunnyConfig().cdnHostname;
  if (host) return `https://${host}/${videoId}/playlist.m3u8`;
  return getBunnyEmbedUrl(libraryId, videoId);
}

export interface BunnyCreateVideoResult {
  configured: boolean;
  bunnyVideoId: string | null;
  bunnyLibraryId: string | null;
  authorizationSignature: string | null;
  authorizationExpire: number | null;
  uploadUrl: string | null;
  embedUrl: string | null;
  playbackUrl: string | null;
  error?: string;
  code?: "BUNNY_NOT_CONFIGURED" | "BUNNY_UPLOAD_FAILED";
}

function emptyResult(
  extra: Partial<BunnyCreateVideoResult> & Pick<BunnyCreateVideoResult, "configured">
): BunnyCreateVideoResult {
  return {
    bunnyVideoId: null,
    bunnyLibraryId: extra.bunnyLibraryId ?? null,
    authorizationSignature: null,
    authorizationExpire: null,
    uploadUrl: null,
    embedUrl: null,
    playbackUrl: null,
    ...extra,
  };
}

/**
 * Create a Bunny Stream video object and return a client TUS authorization.
 * Direct TUS upload happens in the browser — the Next.js server does not proxy the file.
 */
export async function createBunnyVideo(params: {
  title: string;
}): Promise<BunnyCreateVideoResult> {
  const config = getBunnyConfig();
  if (!config.apiKey || !config.libraryId) {
    return emptyResult({
      configured: false,
      code: "BUNNY_NOT_CONFIGURED",
      error: "Infraestrutura Bunny Stream ainda não configurada neste ambiente.",
    });
  }

  const response = await fetch(`${BUNNY_STREAM_API}/library/${config.libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: config.apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: params.title || "product-video" }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.warn("[bunny] create video failed", response.status, detail.slice(0, 400));
    return emptyResult({
      configured: true,
      bunnyLibraryId: config.libraryId,
      code: "BUNNY_UPLOAD_FAILED",
      error: "Não foi possível iniciar o carregamento no Bunny Stream.",
    });
  }

  const created = (await response.json()) as { guid?: string };
  const videoId = created.guid || null;
  if (!videoId) {
    return emptyResult({
      configured: true,
      bunnyLibraryId: config.libraryId,
      code: "BUNNY_UPLOAD_FAILED",
      error: "Não foi possível iniciar o carregamento no Bunny Stream.",
    });
  }

  const expire = Math.floor(Date.now() / 1000) + 60 * 60 * 6;
  const signature = createHash("sha256")
    .update(`${config.libraryId}${config.apiKey}${expire}${videoId}`)
    .digest("hex");

  return {
    configured: true,
    bunnyVideoId: videoId,
    bunnyLibraryId: config.libraryId,
    authorizationSignature: signature,
    authorizationExpire: expire,
    uploadUrl: BUNNY_TUS_ENDPOINT,
    embedUrl: getBunnyEmbedUrl(config.libraryId, videoId),
    playbackUrl: getBunnyPlaybackUrl(config.libraryId, videoId),
  };
}

/**
 * Reads the current encoding state straight from Bunny.
 *
 * The webhook cannot reach a local dev server, and a missed delivery in any
 * environment would leave a row stuck at "uploading" forever, so playback must
 * not depend on it.
 */
export async function fetchBunnyVideoStatus(
  bunnyVideoId: string
): Promise<{ status: BunnyVideoStatus; thumbnailUrl: string | null } | null> {
  const config = getBunnyConfig();
  if (!config.apiKey || !config.libraryId || !bunnyVideoId) return null;

  try {
    const response = await fetch(
      `${BUNNY_STREAM_API}/library/${config.libraryId}/videos/${bunnyVideoId}`,
      { headers: { AccessKey: config.apiKey, Accept: "application/json" }, cache: "no-store" }
    );
    if (!response.ok) return null;

    const video = (await response.json()) as { status?: number; thumbnailFileName?: string };
    const status = mapBunnyStatus(Number(video.status));
    const thumbnailUrl =
      video.thumbnailFileName && config.cdnHostname
        ? `https://${config.cdnHostname}/${bunnyVideoId}/${video.thumbnailFileName}`
        : null;
    return { status, thumbnailUrl };
  } catch (error) {
    console.warn(
      "[bunny] status lookup failed:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

export async function deleteBunnyVideo(bunnyVideoId: string): Promise<boolean> {
  const config = getBunnyConfig();
  if (!config.apiKey || !config.libraryId || !bunnyVideoId) return false;
  const response = await fetch(
    `${BUNNY_STREAM_API}/library/${config.libraryId}/videos/${bunnyVideoId}`,
    {
      method: "DELETE",
      headers: { AccessKey: config.apiKey, Accept: "application/json" },
    }
  );
  return response.ok;
}

export function mapBunnyStatus(statusCode?: number): BunnyVideoStatus {
  // Bunny Stream: 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error, 6=upload_failed
  switch (statusCode) {
    case 0:
      return "pending";
    case 1:
      return "uploading";
    case 2:
    case 3:
      return "processing";
    case 4:
      return "ready";
    case 5:
    case 6:
      return "failed";
    default:
      return "processing";
  }
}

export function verifyBunnyWebhook(headers: Record<string, string>): boolean {
  const config = getBunnyConfig();
  if (!config.webhookSecret) return isBunnyConfigured();
  const provided =
    headers["x-bunny-signature"] ||
    headers["bunny-signature"] ||
    headers["authorization"] ||
    "";
  return provided === config.webhookSecret;
}
