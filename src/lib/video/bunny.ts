/**
 * Bunny Stream integration for AgriAcademy videos.
 * Credentials stay on the server. The browser never receives private API keys.
 *
 * Environment variables (only those required by Bunny Stream):
 * - BUNNY_STREAM_API_KEY
 * - BUNNY_STREAM_LIBRARY_ID
 * - BUNNY_STREAM_CDN_HOSTNAME
 * - BUNNY_STREAM_WEBHOOK_SECRET (optional authenticity check)
 */

export type BunnyVideoStatus = "pending" | "uploading" | "processing" | "ready" | "failed" | "deleted";

export function isBunnyConfigured(): boolean {
  return Boolean(process.env.BUNNY_STREAM_API_KEY && process.env.BUNNY_STREAM_LIBRARY_ID);
}

export function getBunnyConfig() {
  return {
    apiKey: process.env.BUNNY_STREAM_API_KEY || "",
    libraryId: process.env.BUNNY_STREAM_LIBRARY_ID || "",
    cdnHostname: process.env.BUNNY_STREAM_CDN_HOSTNAME || "",
    webhookSecret: process.env.BUNNY_STREAM_WEBHOOK_SECRET || "",
  };
}

export interface BunnyCreateVideoResult {
  configured: boolean;
  bunnyVideoId: string | null;
  bunnyLibraryId: string | null;
  authorizationSignature: string | null;
  authorizationExpire: number | null;
  uploadUrl: string | null;
  error?: string;
}

/**
 * Create a Bunny Stream video object and return a client upload authorization.
 * Direct TUS upload happens in the browser — the Next.js server does not proxy the file.
 */
export async function createBunnyVideo(params: {
  title: string;
}): Promise<BunnyCreateVideoResult> {
  const config = getBunnyConfig();
  if (!config.apiKey || !config.libraryId) {
    return {
      configured: false,
      bunnyVideoId: null,
      bunnyLibraryId: null,
      authorizationSignature: null,
      authorizationExpire: null,
      uploadUrl: null,
      error: "Infraestrutura Bunny Stream ainda não configurada neste ambiente.",
    };
  }

  const response = await fetch(`https://video.bunnycdn.com/library/${config.libraryId}/videos`, {
    method: "POST",
    headers: {
      AccessKey: config.apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: params.title }),
  });

  if (!response.ok) {
    return {
      configured: true,
      bunnyVideoId: null,
      bunnyLibraryId: config.libraryId,
      authorizationSignature: null,
      authorizationExpire: null,
      uploadUrl: null,
      error: "Não foi possível iniciar o carregamento no Bunny Stream.",
    };
  }

  const created = (await response.json()) as { guid?: string };
  const videoId = created.guid || null;
  const expire = Math.floor(Date.now() / 1000) + 60 * 60;
  const { createHash } = await import("crypto");
  const signature = createHash("sha256")
    .update(`${config.libraryId}${config.apiKey}${expire}${videoId || ""}`)
    .digest("hex");

  return {
    configured: true,
    bunnyVideoId: videoId,
    bunnyLibraryId: config.libraryId,
    authorizationSignature: signature,
    authorizationExpire: expire,
    uploadUrl: videoId
      ? `https://video.bunnycdn.com/tusupload`
      : null,
  };
}

export async function deleteBunnyVideo(bunnyVideoId: string): Promise<boolean> {
  const config = getBunnyConfig();
  if (!config.apiKey || !config.libraryId || !bunnyVideoId) return false;
  const response = await fetch(
    `https://video.bunnycdn.com/library/${config.libraryId}/videos/${bunnyVideoId}`,
    {
      method: "DELETE",
      headers: { AccessKey: config.apiKey, Accept: "application/json" },
    }
  );
  return response.ok;
}

export function mapBunnyStatus(statusCode?: number): BunnyVideoStatus {
  // Bunny Stream video status codes: 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error, 6=upload_failed
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
