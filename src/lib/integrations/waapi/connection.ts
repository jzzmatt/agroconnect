import { assertWaapiInstanceId, waapiRequest } from "./client";
import { WaapiError, type WaapiInstanceStatus } from "./types";

const DATA_IMAGE = /^data:image\/(?:png|jpeg);base64,[a-z0-9+/=\s]+$/i;

/** Accept only the documented data-URL QR. Anything else is not shown. */
export function readQrDataUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const qrCode = (payload as { qrCode?: { data?: { qr_code?: unknown } } }).qrCode;
  const value = qrCode?.data?.qr_code;
  if (typeof value !== "string") return null;
  const compact = value.trim();
  if (compact.length > 600_000 || !DATA_IMAGE.test(compact)) return null;
  return compact;
}

export function readInstanceStatus(payload: unknown): WaapiInstanceStatus | null {
  if (!payload || typeof payload !== "object") return null;
  const status = (payload as { clientStatus?: { instanceStatus?: unknown } }).clientStatus
    ?.instanceStatus;
  if (
    status === "booting" ||
    status === "loading_screen" ||
    status === "qr" ||
    status === "authenticated" ||
    status === "auth_failure" ||
    status === "ready" ||
    status === "disconnected"
  ) {
    return status;
  }
  return null;
}

export function readConnectedPhone(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { me?: { data?: { formattedNumber?: unknown; contactId?: unknown } } })
    .me?.data;
  const formatted = typeof data?.formattedNumber === "string" ? data.formattedNumber.trim() : "";
  if (formatted) return formatted.slice(0, 32);
  const contactId = typeof data?.contactId === "string" ? data.contactId.trim() : "";
  const digits = contactId.replace(/@c\.us$/i, "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

export async function retrieveWaapiQr(
  instanceId: string,
  fetchImpl?: typeof fetch
): Promise<string> {
  const payload = await waapiRequest<unknown>(
    `/instances/${assertWaapiInstanceId(instanceId)}/client/qr`,
    { method: "GET" },
    fetchImpl
  );
  const qr = readQrDataUrl(payload);
  if (!qr) throw new WaapiError(502);
  return qr;
}

export async function retrieveWaapiStatus(
  instanceId: string,
  fetchImpl?: typeof fetch
): Promise<WaapiInstanceStatus> {
  const payload = await waapiRequest<unknown>(
    `/instances/${assertWaapiInstanceId(instanceId)}/client/status`,
    { method: "GET" },
    fetchImpl
  );
  const status = readInstanceStatus(payload);
  if (!status) throw new WaapiError(502);
  return status;
}

export async function retrieveWaapiMe(
  instanceId: string,
  fetchImpl?: typeof fetch
): Promise<string | null> {
  const payload = await waapiRequest<unknown>(
    `/instances/${assertWaapiInstanceId(instanceId)}/client/me`,
    { method: "GET" },
    fetchImpl
  );
  return readConnectedPhone(payload);
}

export async function logoutWaapiClient(
  instanceId: string,
  fetchImpl?: typeof fetch
): Promise<void> {
  const payload = await waapiRequest<unknown>(
    `/instances/${assertWaapiInstanceId(instanceId)}/client/action/logout`,
    { method: "POST" },
    fetchImpl
  );
  if (!payload || typeof payload !== "object") throw new WaapiError(502);
  const inner = (payload as { data?: { status?: unknown } }).data;
  if (inner && typeof inner === "object" && inner.status === "error") {
    throw new WaapiError(409);
  }
}
