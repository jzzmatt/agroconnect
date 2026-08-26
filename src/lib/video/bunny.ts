/**
 * Bunny Stream integration for AgriAcademy training video only (Phase 4
 * narrowed Bunny off AgriShopping product video, which now uses ImageKit).
 * Credentials stay on the server. The browser never receives private API keys.
 *
 * Required environment variables:
 * - BUNNY_STREAM_API_KEY        Stream *library* API key (not the account key)
 * - BUNNY_STREAM_LIBRARY_ID     Numeric Stream library ID
 * - BUNNY_STREAM_CDN_HOSTNAME   Pull zone host, e.g. vz-xxxxx.b-cdn.net
 * - BUNNY_STREAM_WEBHOOK_SECRET Required to accept /api/webhooks/bunny deliveries.
 *   Set this to the library's webhook signing secret (Bunny dashboard → Stream
 *   → your library → Webhooks). Without it every webhook delivery is rejected
 *   with 401 — there is no unsigned fallback.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
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

export type BunnyVideoSnapshot = {
  status: BunnyVideoStatus;
  statusCode: number;
  thumbnailUrl: string | null;
  encodeProgress: number;
  storageSize: number;
};

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

/** Bunny Stream library IDs are numeric. Rejects UUIDs and empty values early. */
export function parseBunnyLibraryId(value: string | number | null | undefined): string {
  const normalized = trimEnv(value == null ? "" : String(value));
  if (!/^\d+$/.test(normalized)) {
    throw Object.assign(new Error("BUNNY_STREAM_LIBRARY_ID inválido ou em falta."), {
      code: "BUNNY_LIBRARY_ID_INVALID",
    });
  }
  return normalized;
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
  const libraryId = normalized.libraryId
    ? (() => {
        try {
          return parseBunnyLibraryId(normalized.libraryId);
        } catch {
          return "";
        }
      })()
    : "";
  return {
    apiKey: normalized.apiKey,
    libraryId,
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

  const created = (await response.json()) as { guid?: string; videoLibraryId?: number | string };
  const videoId = created.guid || null;
  if (!videoId) {
    return emptyResult({
      configured: true,
      bunnyLibraryId: config.libraryId,
      code: "BUNNY_UPLOAD_FAILED",
      error: "Não foi possível iniciar o carregamento no Bunny Stream.",
    });
  }

  const libraryId = parseBunnyLibraryId(
    created.videoLibraryId != null ? created.videoLibraryId : config.libraryId
  );
  const expire = buildBunnyTusAuthorizationExpire();
  const signature = buildBunnyTusAuthorizationSignature({
    libraryId,
    apiKey: config.apiKey,
    expire,
    videoId,
  });

  return {
    configured: true,
    bunnyVideoId: videoId,
    bunnyLibraryId: libraryId,
    authorizationSignature: signature,
    authorizationExpire: expire,
    uploadUrl: BUNNY_TUS_ENDPOINT,
    embedUrl: getBunnyEmbedUrl(libraryId, videoId),
    playbackUrl: getBunnyPlaybackUrl(libraryId, videoId),
  };
}

/** Server-side binary upload (PUT) — reliable alternative to browser TUS. */
export async function uploadBunnyVideoBinary(params: {
  bunnyVideoId: string;
  libraryId?: string | null;
  body: ArrayBuffer | ReadableStream<Uint8Array>;
  contentType?: string;
  contentLength?: number;
}): Promise<{ ok: boolean; status: number; error?: string }> {
  const config = getBunnyConfig();
  if (!config.apiKey || !config.libraryId) {
    return { ok: false, status: 0, error: "BUNNY_NOT_CONFIGURED" };
  }

  const libraryId = parseBunnyLibraryId(params.libraryId || config.libraryId);
  const headers: Record<string, string> = {
    AccessKey: config.apiKey,
    Accept: "application/json",
  };
  if (params.contentType) headers["Content-Type"] = params.contentType;
  if (params.contentLength && params.contentLength > 0) {
    headers["Content-Length"] = String(params.contentLength);
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: "PUT",
    headers,
    body: params.body as BodyInit,
  };
  if (params.body instanceof ReadableStream) {
    init.duplex = "half";
  }

  try {
    const response = await fetch(
      `${BUNNY_STREAM_API}/library/${libraryId}/videos/${params.bunnyVideoId}`,
      init
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { ok: false, status: response.status, error: detail.slice(0, 400) };
    }
    return { ok: true, status: response.status };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "upload failed",
    };
  }
}

/**
 * Reads the current encoding state straight from Bunny.
 *
 * The webhook cannot reach a local dev server, and a missed delivery in any
 * environment would leave a row stuck at "uploading" forever, so playback must
 * not depend on it.
 */
export async function fetchBunnyVideoStatus(bunnyVideoId: string): Promise<BunnyVideoSnapshot | null> {
  const config = getBunnyConfig();
  if (!config.apiKey || !config.libraryId || !bunnyVideoId) return null;

  try {
    const response = await fetch(
      `${BUNNY_STREAM_API}/library/${config.libraryId}/videos/${bunnyVideoId}`,
      { headers: { AccessKey: config.apiKey, Accept: "application/json" }, cache: "no-store" }
    );
    if (response.status === 404) {
      return {
        status: "deleted",
        statusCode: -1,
        thumbnailUrl: null,
        encodeProgress: 0,
        storageSize: 0,
      };
    }
    if (!response.ok) return null;

    const video = (await response.json()) as {
      status?: number;
      thumbnailFileName?: string;
      encodeProgress?: number;
      storageSize?: number;
    };
    const statusCode = Number(video.status ?? 0);
    const status = mapBunnyStatus(statusCode);
    const thumbnailUrl =
      video.thumbnailFileName && config.cdnHostname
        ? `https://${config.cdnHostname}/${bunnyVideoId}/${video.thumbnailFileName}`
        : null;
    return {
      status,
      statusCode,
      thumbnailUrl,
      encodeProgress: Math.max(0, Math.min(100, Number(video.encodeProgress ?? 0))),
      storageSize: Number(video.storageSize ?? 0),
    };
  } catch (error) {
    console.warn(
      "[bunny] status lookup failed:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

export interface BunnyLibraryVideoSummary {
  guid: string;
  title: string;
  status: BunnyVideoStatus;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

/** Paginated inventory of the configured Bunny Stream library. */
export async function listBunnyLibraryVideos(): Promise<BunnyLibraryVideoSummary[]> {
  const config = getBunnyConfig();
  if (!config.apiKey || !config.libraryId) return [];

  const results: BunnyLibraryVideoSummary[] = [];
  let page = 1;
  const itemsPerPage = 100;

  try {
    while (page <= 10) {
      const response = await fetch(
        `${BUNNY_STREAM_API}/library/${config.libraryId}/videos?page=${page}&itemsPerPage=${itemsPerPage}&orderBy=date`,
        { headers: { AccessKey: config.apiKey, Accept: "application/json" }, cache: "no-store" }
      );
      if (!response.ok) {
        console.warn("[bunny] list videos failed", response.status);
        break;
      }

      const payload = (await response.json()) as {
        items?: Array<{
          guid?: string;
          title?: string;
          status?: number;
          length?: number;
          thumbnailFileName?: string;
        }>;
      };
      const items = payload.items || [];
      for (const item of items) {
        const guid = String(item.guid || "").trim();
        if (!guid) continue;
        results.push({
          guid,
          title: String(item.title || "Untitled"),
          status: mapBunnyStatus(Number(item.status)),
          thumbnailUrl:
            item.thumbnailFileName && config.cdnHostname
              ? `https://${config.cdnHostname}/${guid}/${item.thumbnailFileName}`
              : null,
          durationSeconds: Number(item.length) > 0 ? Number(item.length) : null,
        });
      }

      if (items.length < itemsPerPage) break;
      page += 1;
    }
  } catch (error) {
    console.warn("[bunny] list videos error:", error instanceof Error ? error.message : error);
  }

  return results;
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

/** True once Bunny has received the binary (not just the empty video object). */
export function isBunnyUploadReceived(status: BunnyVideoStatus): boolean {
  return status !== "pending" && status !== "deleted";
}

export async function pollBunnyUploadReceived(
  bunnyVideoId: string,
  options: { attempts?: number; delayMs?: number } = {}
): Promise<BunnyVideoSnapshot | null> {
  const attempts = options.attempts ?? 45;
  const delayMs = options.delayMs ?? 1000;
  let last: BunnyVideoSnapshot | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    last = await fetchBunnyVideoStatus(bunnyVideoId);
    if (!last || last.status === "deleted") return last;
    if (isBunnyUploadReceived(last.status)) return last;
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return last;
}

export function buildBunnyTusAuthorizationExpire(secondsFromNow = 60 * 60 * 24): number {
  return Math.floor(Date.now() / 1000) + secondsFromNow;
}

export function buildBunnyTusAuthorizationSignature(params: {
  libraryId: string;
  apiKey: string;
  expire: number;
  videoId: string;
}): string {
  return createHash("sha256")
    .update(`${params.libraryId}${params.apiKey}${params.expire}${params.videoId}`)
    .digest("hex");
}

/**
 * Verifies a Bunny Stream webhook per Bunny's documented `v1` scheme:
 * lowercase hex HMAC-SHA256 of the exact raw request body, keyed with the
 * library's webhook signing secret, delivered in `X-BunnyStream-Signature`.
 *
 * Deliberately fails closed: a missing secret or signature is rejected
 * rather than treated as "trust this request because Bunny is configured".
 * Comparison is timing-safe so response time cannot leak the secret.
 */
export function verifyBunnyWebhook(rawBody: string, headers: Record<string, string>): boolean {
  const config = getBunnyConfig();
  if (!config.webhookSecret) return false;

  const provided = (headers["x-bunnystream-signature"] || "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(provided)) return false;

  const expected = createHmac("sha256", config.webhookSecret).update(rawBody, "utf8").digest("hex");

  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}
