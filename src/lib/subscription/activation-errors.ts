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

/**
 * A generic "could not update your plan" hides whether the environment has the
 * feature switched off, the database is unreachable, or the write was rejected.
 * The code is appended so the cause is identifiable from the screen alone.
 */
export function withDiagnosticCode(message: string, code?: string | null): string {
  if (!code || code === "ACTIVATED" || code === "AUTH_REQUIRED") return message;
  return `${message} (${code})`;
}
