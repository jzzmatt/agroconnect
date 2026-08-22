const TRANSIENT_PUBLISH =
  /message port|asynchronous response|failed to fetch|network|timeout|abort|load failed|opaqueredirect/i;

export function isTransientPublishError(raw?: string | null) {
  return TRANSIENT_PUBLISH.test(String(raw || ""));
}

export function sanitizePublishError(raw?: string | null, fallback = "PRODUCT_PUBLISH_FAILED") {
  const message = String(raw || "").trim();
  if (!message || isTransientPublishError(message)) return fallback;
  return message;
}
