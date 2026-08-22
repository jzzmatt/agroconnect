/**
 * Node's fetch (undici) throws a bare "fetch failed" when a connection to
 * Supabase drops, resolves slowly, or is reset. These are retryable and must
 * not be reported as a validation or entitlement problem.
 */
const TRANSIENT_NETWORK =
  /fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|EPIPE|socket hang up|other side closed|premature close|network|timeout|aborted/i;

export function isTransientSupabaseError(error: unknown): boolean {
  return TRANSIENT_NETWORK.test(describeSupabaseError(error));
}

/**
 * Flattens an undici error chain so logs show the real reason
 * (for example ENOTFOUND) instead of only "fetch failed".
 */
export function describeSupabaseError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth += 1) {
    if (typeof current === "string") {
      parts.push(current);
      break;
    }
    if (current instanceof Error) {
      parts.push(current.message);
      const code = (current as { code?: unknown }).code;
      if (typeof code === "string") parts.push(code);
      current = (current as { cause?: unknown }).cause;
      continue;
    }
    if (typeof current === "object") {
      const message = (current as { message?: unknown }).message;
      if (typeof message === "string") parts.push(message);
      const code = (current as { code?: unknown }).code;
      if (typeof code === "string") parts.push(code);
      current = (current as { cause?: unknown }).cause;
      continue;
    }
    break;
  }
  return parts.filter(Boolean).join(": ");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a Supabase call while the failure looks like a dropped connection.
 * `run` must build a fresh query each attempt, because a Supabase query
 * builder can only be awaited once.
 */
export async function withSupabaseRetry<T = any>(
  label: string,
  run: () => PromiseLike<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!isTransientSupabaseError(error) || attempt === attempts) break;
      console.warn(
        `[supabase retry] ${label} attempt ${attempt}/${attempts}:`,
        describeSupabaseError(error)
      );
      await delay(250 * attempt);
    }
  }
  throw lastError;
}
