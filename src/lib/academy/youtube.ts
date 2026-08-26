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

export function isYouTubeVideoId(value: string | null | undefined): value is string {
  return Boolean(value && YOUTUBE_VIDEO_ID_PATTERN.test(value));
}

/**
 * Accepts a raw 11-character Video ID or a YouTube watch/embed/shorts/share URL.
 * Returns null when the input is not a valid YouTube reference.
 */
export function extractYouTubeVideoId(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (YOUTUBE_VIDEO_ID_PATTERN.test(trimmed)) return trimmed;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return isYouTubeVideoId(id) ? id : null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (
    parts[0] === "embed" ||
    parts[0] === "shorts" ||
    parts[0] === "live" ||
    parts[0] === "v"
  ) {
    const id = parts[1] ?? "";
    return isYouTubeVideoId(id) ? id : null;
  }

  const fromQuery = url.searchParams.get("v");
  return isYouTubeVideoId(fromQuery) ? fromQuery : null;
}

export function buildYouTubeEmbedUrl(videoId: string | null | undefined): string | null {
  if (!isYouTubeVideoId(videoId)) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
