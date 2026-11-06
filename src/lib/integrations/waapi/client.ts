import { WaapiError } from "./types";

const DEFAULT_BASE_URL = "https://waapi.app/api/v1";

export function waapiBaseUrl(): string {
  const configured = process.env.WAAPI_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return configured.replace(/\/$/, "");
}

export function waapiToken(): string {
  const token = process.env.WAAPI_API_TOKEN?.trim() || "";
  if (!token) throw new WaapiError(503);
  return token;
}

export function assertWaapiInstanceId(id: string): string {
  if (!/^\d{1,20}$/.test(id)) throw new WaapiError(400);
  return id;
}

/**
 * Server-only WaAPI request. The bearer token is read here and is never copied
 * into the thrown error.
 */
export async function waapiRequest<T>(
  path: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch
): Promise<T> {
  const token = waapiToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetchImpl(`${waapiBaseUrl()}${path}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });

  if (response.status === 204) return undefined as T;

  if (!response.ok) {
    await response.text().catch(() => "");
    throw new WaapiError(response.status);
  }

  return (await response.json()) as T;
}
