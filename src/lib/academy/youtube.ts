export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export type YouTubeRejectReason = "empty" | "malformed" | "not_youtube" | "channel" | "playlist";

export type YouTubeAnalysis =
  | { ok: true; videoId: string; normalizedUrl: string }
  | { ok: false; reason: YouTubeRejectReason };

export function isYouTubeVideoId(value: string | null | undefined): value is string {
  return Boolean(value && YOUTUBE_VIDEO_ID_PATTERN.test(value));
}

export function buildNormalizedYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function buildYouTubeThumbnailUrl(videoId: string | null | undefined): string | null {
  if (!isYouTubeVideoId(videoId)) return null;
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function acceptedVideo(videoId: string): YouTubeAnalysis {
  return { ok: true, videoId, normalizedUrl: buildNormalizedYouTubeWatchUrl(videoId) };
}

/**
 * Accepts a raw 11-character Video ID or a YouTube watch/embed/shorts/share URL.
 * Rejects channels, playlists, malformed input, and non-YouTube hosts.
 */
export function analyzeYouTubeInput(input: string | null | undefined): YouTubeAnalysis {
  if (!input) return { ok: false, reason: "empty" };
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (YOUTUBE_VIDEO_ID_PATTERN.test(trimmed)) return acceptedVideo(trimmed);

  const hasProtocol = /^https?:\/\//i.test(trimmed);
  if (!hasProtocol && !trimmed.includes(".") && !trimmed.includes("/")) {
    return { ok: false, reason: "malformed" };
  }

  const withProtocol = hasProtocol ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const hostname = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(hostname)) return { ok: false, reason: "not_youtube" };

  const host = hostname.replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  const first = parts[0] ?? "";
  const queryVideoId = url.searchParams.get("v");
  const playlistId = url.searchParams.get("list");

  if (host === "youtu.be") {
    const id = parts[0] ?? "";
    if (isYouTubeVideoId(id)) return acceptedVideo(id);
    return { ok: false, reason: "malformed" };
  }

  if (first === "playlist" || first === "playlists") {
    return { ok: false, reason: "playlist" };
  }

  if (first === "channel" || first === "c" || first === "user" || first.startsWith("@")) {
    return { ok: false, reason: "channel" };
  }

  if (first === "embed" || first === "shorts" || first === "live" || first === "v") {
    const id = parts[1] ?? "";
    if (isYouTubeVideoId(id)) return acceptedVideo(id);
    return { ok: false, reason: "malformed" };
  }

  if (isYouTubeVideoId(queryVideoId)) return acceptedVideo(queryVideoId);

  if (first === "watch" && playlistId) {
    return { ok: false, reason: "playlist" };
  }

  if (playlistId) return { ok: false, reason: "playlist" };

  return { ok: false, reason: "malformed" };
}

/**
 * Accepts a raw 11-character Video ID or a YouTube watch/embed/shorts/share URL.
 * Returns null when the input is not a valid YouTube video reference.
 */
export function extractYouTubeVideoId(input: string | null | undefined): string | null {
  const analysis = analyzeYouTubeInput(input);
  return analysis.ok ? analysis.videoId : null;
}

export function buildYouTubeEmbedUrl(videoId: string | null | undefined): string | null {
  if (!isYouTubeVideoId(videoId)) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
