const TRANSIENT_ACTIVATION =
  /message port|failed to fetch|network|timeout|abort|load failed|opaqueredirect/i;

export function sanitizeActivationError(
  raw?: string | null,
  fallback = "Não foi possível atualizar o seu plano."
) {
  const message = String(raw || "").trim();
  if (!message || TRANSIENT_ACTIVATION.test(message)) return fallback;
  return message;
}
