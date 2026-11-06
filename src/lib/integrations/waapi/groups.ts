import { assertWaapiInstanceId, waapiRequest } from "./client";
import { WaapiError, type WaapiChat } from "./types";

const GROUP_ID = /^[A-Za-z0-9_-]{5,120}@g\.us$/;
const PAGE_SIZE = 50;
const MAX_PAGES = 10;

export function isWhatsappGroupId(value: string): boolean {
  return GROUP_ID.test(value);
}

function readChatId(chat: Record<string, unknown>): string | null {
  const id = chat.id;
  if (typeof id === "string") return id;
  if (id && typeof id === "object") {
    const serialized = (id as { _serialized?: unknown })._serialized;
    if (typeof serialized === "string") return serialized;
  }
  return null;
}

function readImage(chat: Record<string, unknown>): string | null {
  const candidate = chat.profilePicUrl;
  if (typeof candidate !== "string" || !candidate.startsWith("https://") || candidate.length > 2000) {
    return null;
  }
  return candidate;
}

/**
 * Keep group identity only. Message bodies on the chat object are dropped.
 * A chat is a group when its id ends in @g.us.
 */
export function extractGroups(chats: unknown): WaapiChat[] {
  if (!Array.isArray(chats)) return [];
  const groups: WaapiChat[] = [];
  for (const chat of chats) {
    if (!chat || typeof chat !== "object") continue;
    const record = chat as Record<string, unknown>;
    const id = readChatId(record);
    if (!id || !isWhatsappGroupId(id)) continue;
    const name = typeof record.name === "string" ? record.name.trim().slice(0, 200) : "";
    groups.push({
      id,
      name: name || "Grupo",
      isGroup: true,
      imageUrl: readImage(record),
    });
  }
  return groups;
}

export function readChats(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") throw new WaapiError(502);
  const inner = (payload as { data?: { status?: unknown; data?: unknown } }).data;
  if (!inner || typeof inner !== "object") throw new WaapiError(502);
  if (inner.status === "error") throw new WaapiError(422);
  if (inner.status !== "success" || !Array.isArray(inner.data)) throw new WaapiError(502);
  return inner.data;
}

export async function retrieveWaapiGroups(
  instanceId: string,
  fetchImpl?: typeof fetch
): Promise<WaapiChat[]> {
  const id = assertWaapiInstanceId(instanceId);
  const seen = new Map<string, WaapiChat>();
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const payload = await waapiRequest<unknown>(
      `/instances/${id}/client/action/get-chats`,
      {
        method: "POST",
        body: JSON.stringify({ offset: page * PAGE_SIZE, limit: PAGE_SIZE }),
      },
      fetchImpl
    );
    const chats = readChats(payload);
    for (const group of extractGroups(chats)) seen.set(group.id, group);
    if (chats.length < PAGE_SIZE) break;
  }
  return [...seen.values()];
}
