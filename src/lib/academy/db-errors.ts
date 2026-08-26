export function supabaseErrorParts(cause: unknown): { code: string; message: string } {
  if (!cause || typeof cause !== "object") {
    return { code: "", message: typeof cause === "string" ? cause : "" };
  }

  const obj = cause as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
    cause?: unknown;
  };
  const nested =
    obj.cause && typeof obj.cause === "object"
      ? (obj.cause as { code?: string; message?: string; details?: string })
      : null;

  return {
    code: String(obj.code || nested?.code || ""),
    message: String(obj.message || nested?.message || obj.details || nested?.details || ""),
  };
}

export function isMissingYoutubeColumnError(cause: unknown): boolean {
  const { code, message } = supabaseErrorParts(cause);
  const haystack = `${code} ${message}`.toLowerCase();
  return (
    code === "PGRST204" ||
    code === "42703" ||
    (haystack.includes("youtube_video_id") &&
      (haystack.includes("schema cache") ||
        haystack.includes("does not exist") ||
        haystack.includes("could not find")))
  );
}

export function mutationRecordHasYouTubeId(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const row = data as Record<string, unknown>;
  if (typeof row.youtube_video_id === "string" && row.youtube_video_id.trim() !== "") {
    return true;
  }
  if ("data" in row) return mutationRecordHasYouTubeId(row.data);
  return false;
}
