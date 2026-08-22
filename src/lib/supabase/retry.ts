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
 * supabase-js catches a connection failure and hands it back as
 * `{ error: { message: "TypeError: fetch failed" } }` rather than throwing,
 * so a returned error has to be inspected as well as a thrown one.
 */
function resultCarriesTransientError(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const error = (result as { error?: unknown }).error;
  return Boolean(error) && isTransientSupabaseError(error);
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
      const result = await run();
      if (attempt < attempts && resultCarriesTransientError(result)) {
        console.warn(
          `[supabase retry] ${label} attempt ${attempt}/${attempts}:`,
          describeSupabaseError((result as { error?: unknown }).error)
        );
        await delay(250 * attempt);
        continue;
      }
      return result;
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

/**
 * supabase-js discards undici's `cause`, so "fetch failed" arrives with no
 * reason. Probe the REST endpoint directly to recover the real cause
 * (ENOTFOUND, ECONNRESET, certificate failure) for the error message.
 */
export async function describeSupabaseReachability(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "NEXT_PUBLIC_SUPABASE_URL is not set";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
      method: "HEAD",
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "" },
      signal: controller.signal,
      cache: "no-store",
    });
    return `reachable (HTTP ${response.status})`;
  } catch (error) {
    return describeSupabaseError(error) || "unreachable";
  } finally {
    clearTimeout(timer);
  }
}
