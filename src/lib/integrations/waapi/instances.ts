import { assertWaapiInstanceId, waapiRequest } from "./client";
import { WAAPI_CONNECTION_EVENTS, WaapiError, type WaapiInstance } from "./types";

export function readInstanceId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as {
    instance?: { id?: unknown };
    data?: { id?: unknown };
    id?: unknown;
  };
  const id = root.instance?.id ?? root.data?.id ?? root.id;
  if (typeof id === "number" && Number.isInteger(id) && id > 0) return String(id);
  if (typeof id === "string" && /^\d{1,20}$/.test(id)) return id;
  return null;
}

export async function createWaapiInstance(
  input: { name: string; webhookUrl: string },
  fetchImpl?: typeof fetch
): Promise<WaapiInstance> {
  const payload = await waapiRequest<unknown>(
    "/instances",
    {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        webhook: {
          url: input.webhookUrl,
          events: [...WAAPI_CONNECTION_EVENTS],
        },
      }),
    },
    fetchImpl
  );
  const id = readInstanceId(payload);
  if (!id) throw new WaapiError(502);
  return { id, name: input.name };
}

export async function updateWaapiWebhook(
  instanceId: string,
  webhookUrl: string,
  fetchImpl?: typeof fetch
): Promise<void> {
  await waapiRequest(
    `/instances/${assertWaapiInstanceId(instanceId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        webhook: {
          url: webhookUrl,
          events: [...WAAPI_CONNECTION_EVENTS],
        },
      }),
    },
    fetchImpl
  );
}

export async function deleteWaapiInstance(
  instanceId: string,
  fetchImpl?: typeof fetch
): Promise<void> {
  await waapiRequest(
    `/instances/${assertWaapiInstanceId(instanceId)}`,
    { method: "DELETE" },
    fetchImpl
  );
}

export async function retrieveWaapiInstance(
  instanceId: string,
  fetchImpl?: typeof fetch
): Promise<WaapiInstance> {
  const payload = await waapiRequest<unknown>(
    `/instances/${assertWaapiInstanceId(instanceId)}`,
    { method: "GET" },
    fetchImpl
  );
  const id = readInstanceId(payload) ?? assertWaapiInstanceId(instanceId);
  return { id, name: null };
}
