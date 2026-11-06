import type { WaapiInstanceStatus } from "@/lib/integrations/waapi/types";
import type {
  ConnectionRecord,
  DiscoveredGroup,
  PublicConnection,
  PublicGroup,
  SavedGroup,
  StoredConnectionStatus,
} from "./types";

export const QR_REQUEST_WINDOW_MS = 15_000;
export const STATUS_POLL_WINDOW_MS = 2_000;
export const CHAT_REQUEST_WINDOW_MS = 10_000;
export const QR_HINT_AFTER_MS = 45_000;

export function retryAfterMs(previous: string | null, now: Date, windowMs: number): number {
  if (!previous) return 0;
  const elapsed = now.getTime() - Date.parse(previous);
  if (!Number.isFinite(elapsed) || elapsed >= windowMs) return 0;
  return windowMs - elapsed;
}

export function mapInstanceStatus(status: string): StoredConnectionStatus | null {
  if (status === "booting" || status === "loading_screen" || status === "authenticated") {
    return "connecting";
  }
  if (status === "qr") return "qr_pending";
  if (status === "ready") return "connected";
  if (status === "auth_failure") return "auth_failure";
  if (status === "disconnected") return "disconnected";
  return null;
}

export function reduceConnection(
  current: { status: StoredConnectionStatus; phone: string | null },
  signal: { kind: "status"; instanceStatus: string } | { kind: "event"; event: string },
  phoneFromMe: string | null
): { status: StoredConnectionStatus; phone: string | null; markConnected: boolean } {
  const next =
    signal.kind === "status"
      ? mapInstanceStatus(signal.instanceStatus)
      : eventStatus(signal.event);
  if (!next) {
    return { status: current.status, phone: current.phone, markConnected: false };
  }
  if (next === "auth_failure" || next === "disconnected" || next === "qr_pending") {
    return { status: next, phone: null, markConnected: false };
  }
  if (next === "connecting") {
    if (phoneFromMe) return { status: "connected", phone: phoneFromMe, markConnected: true };
    return { status: "connecting", phone: current.phone, markConnected: false };
  }
  const phone = phoneFromMe || current.phone;
  if (!phone) return { status: "connecting", phone: null, markConnected: false };
  return { status: "connected", phone, markConnected: true };
}

function eventStatus(event: string): StoredConnectionStatus | null {
  if (event === "loading_screen") return "connecting";
  if (event === "qr") return "qr_pending";
  if (event === "authenticated") return "connecting";
  if (event === "ready") return "connected";
  if (event === "auth_failure") return "auth_failure";
  if (event === "disconnected") return "disconnected";
  return null;
}

export function needsPhoneLookup(status: WaapiInstanceStatus | string): boolean {
  return status === "ready" || status === "authenticated";
}

export function toPublicConnection(
  row: ConnectionRecord | null,
  savedGroupCount: number
): PublicConnection {
  if (!row) {
    return {
      status: "not_connected",
      phone: null,
      connectedAt: null,
      savedGroupCount: 0,
      updatedAt: null,
      qrVersion: 0,
    };
  }
  return {
    status: row.status,
    phone: row.phone,
    connectedAt: row.lastConnectedAt,
    savedGroupCount,
    updatedAt: row.updatedAt,
    qrVersion: row.qrVersion,
  };
}

export function mergeGroups(discovered: DiscoveredGroup[], saved: SavedGroup[]): PublicGroup[] {
  const savedById = new Map(saved.filter((group) => group.isActive).map((group) => [group.whatsappGroupId, group]));
  const merged: PublicGroup[] = discovered.map((group) => {
    const stored = savedById.get(group.id);
    savedById.delete(group.id);
    return {
      id: group.id,
      name: stored?.name || group.name,
      imageUrl: group.imageUrl || stored?.imageUrl || null,
      saved: Boolean(stored),
      available: true,
    };
  });
  for (const stored of savedById.values()) {
    merged.push({
      id: stored.whatsappGroupId,
      name: stored.name,
      imageUrl: stored.imageUrl,
      saved: true,
      available: false,
    });
  }
  return merged;
}

export function searchGroups(groups: PublicGroup[], query: string): PublicGroup[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return groups;
  return groups.filter(
    (group) =>
      group.name.toLocaleLowerCase().includes(needle) ||
      group.id.toLocaleLowerCase().includes(needle)
  );
}

export function upsertSavedGroup(
  rows: SavedGroup[],
  connectionId: string,
  group: DiscoveredGroup,
  now: string
): SavedGroup[] {
  const index = rows.findIndex(
    (row) => row.connectionId === connectionId && row.whatsappGroupId === group.id
  );
  if (index === -1) {
    return [
      ...rows,
      {
        id: `${connectionId}:${group.id}`,
        connectionId,
        whatsappGroupId: group.id,
        name: group.name,
        imageUrl: group.imageUrl,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
  const next = rows.slice();
  next[index] = {
    ...rows[index],
    name: group.name,
    imageUrl: group.imageUrl,
    isActive: true,
    updatedAt: now,
  };
  return next;
}
