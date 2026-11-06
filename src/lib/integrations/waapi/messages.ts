import { assertWaapiInstanceId, waapiRequest } from "./client";
import { isWhatsappGroupId } from "./groups";
import { WaapiError } from "./types";

export interface WaapiSendResult {
  messageId: string | null;
}

function readMessageId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { data?: { status?: unknown; data?: { _data?: { id?: { _serialized?: unknown } } } } }).data;
  if (!data || data.status !== "success") {
    throw new WaapiError(422);
  }
  const id = data.data?._data?.id?._serialized;
  return typeof id === "string" && id.length > 0 ? id.slice(0, 180) : null;
}

async function sendAction(
  instanceId: string,
  action: "send-message" | "send-media",
  body: Record<string, unknown>,
  fetchImpl?: typeof fetch
): Promise<WaapiSendResult> {
  const payload = await waapiRequest<unknown>(
    `/instances/${assertWaapiInstanceId(instanceId)}/client/action/${action}`,
    { method: "POST", body: JSON.stringify(body) },
    fetchImpl
  );
  return { messageId: readMessageId(payload) };
}

export async function sendWaapiText(
  instanceId: string,
  chatId: string,
  message: string,
  fetchImpl?: typeof fetch
): Promise<WaapiSendResult> {
  if (!isWhatsappGroupId(chatId)) throw new WaapiError(400);
  return sendAction(
    instanceId,
    "send-message",
    { chatId, message, previewLink: true },
    fetchImpl
  );
}

export async function sendWaapiMedia(
  instanceId: string,
  chatId: string,
  mediaUrl: string,
  fetchImpl?: typeof fetch
): Promise<WaapiSendResult> {
  if (!isWhatsappGroupId(chatId)) throw new WaapiError(400);
  if (!mediaUrl.startsWith("https://")) throw new WaapiError(400);
  return sendAction(instanceId, "send-media", { chatId, mediaUrl }, fetchImpl);
}
