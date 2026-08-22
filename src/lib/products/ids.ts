export function isUuid(value?: string | null): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

export function normalizeVideoUploadMeta(params: {
  mimeType?: string | null;
  fileName?: string | null;
}) {
  const mime = String(params.mimeType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const normalizedMime = mime === "video/mp4" || mime === "video/webm" ? mime : mime.startsWith("video/") ? "video/webm" : "video/webm";
  const base = String(params.fileName || "product-video").replace(/\.[^.]+$/, "");
  const extension = normalizedMime === "video/mp4" ? ".mp4" : ".webm";
  return {
    mimeType: normalizedMime,
    fileName: `${base || "product-video"}${extension}`,
  };
}
