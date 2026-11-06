import { timingSafeEqual } from "node:crypto";
import { WAAPI_CONNECTION_EVENTS, type WaapiConnectionEvent } from "./types";

export interface WaapiWebhookEvent {
  event: WaapiConnectionEvent | "ignored";
  instanceId: string;
}

function tokensMatch(provided: string, stored: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(stored);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * WaAPI authenticates a webhook by the unguessable token in the URL that was
 * registered for that instance. The body instance id must still match the row
 * that owns the token. Payload contents are not trusted as proof of ownership.
 */
export function authorizeWaapiWebhook(input: {
  providedToken: string;
  storedToken: string | null;
  payloadInstanceId: string;
  storedInstanceId: string | null;
}): boolean {
  const dummy = Buffer.alloc(Buffer.byteLength(input.providedToken), 1).toString("utf8");
  const tokenOk = tokensMatch(input.providedToken, input.storedToken ?? dummy);
  if (!input.storedToken || !input.storedInstanceId || !tokenOk) return false;
  return input.payloadInstanceId === input.storedInstanceId;
}

export function parseWaapiWebhook(payload: unknown): WaapiWebhookEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { event?: unknown; instanceId?: unknown };
  const instanceId =
    typeof record.instanceId === "number"
      ? String(record.instanceId)
      : typeof record.instanceId === "string"
        ? record.instanceId.trim()
        : "";
  if (!/^\d{1,20}$/.test(instanceId) || typeof record.event !== "string") return null;
  const known = (WAAPI_CONNECTION_EVENTS as readonly string[]).includes(record.event);
  return {
    event: known ? (record.event as WaapiConnectionEvent) : "ignored",
    instanceId,
  };
}
