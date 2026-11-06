/** Documented WaAPI instance statuses from GET /instances/{id}/client/status. */
export const WAAPI_INSTANCE_STATUSES = [
  "booting",
  "loading_screen",
  "qr",
  "authenticated",
  "auth_failure",
  "ready",
  "disconnected",
] as const;

export type WaapiInstanceStatus = (typeof WAAPI_INSTANCE_STATUSES)[number];

/** Events this integration registers. Message events are intentionally absent. */
export const WAAPI_CONNECTION_EVENTS = [
  "loading_screen",
  "qr",
  "authenticated",
  "auth_failure",
  "ready",
  "disconnected",
] as const;

export type WaapiConnectionEvent = (typeof WAAPI_CONNECTION_EVENTS)[number];

export interface WaapiInstance {
  id: string;
  name: string | null;
}

export interface WaapiChat {
  id: string;
  name: string;
  isGroup: boolean;
  imageUrl: string | null;
}

export class WaapiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super("WAAPI_REQUEST_FAILED");
    this.name = "WaapiError";
    this.status = status;
  }
}
