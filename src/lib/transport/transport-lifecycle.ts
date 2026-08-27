import type { TransportPublicationStatus } from "@/types/transport";

export const TRANSPORT_STATUS_TRANSITIONS: Record<
  TransportPublicationStatus,
  readonly TransportPublicationStatus[]
> = {
  draft: ["published", "archived"],
  published: ["paused", "archived"],
  paused: ["published", "draft", "archived"],
  archived: [],
};

export function isPubliclyVisibleTransportStatus(status: TransportPublicationStatus): boolean {
  return status === "published";
}

export function canTransitionTransportStatus(
  from: TransportPublicationStatus,
  to: TransportPublicationStatus
): boolean {
  if (from === to) return true;
  return TRANSPORT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransportStatusTransition(
  from: TransportPublicationStatus,
  to: TransportPublicationStatus
): void {
  if (!canTransitionTransportStatus(from, to)) {
    throw new Error(`Transição de estado inválida: ${from} → ${to}`);
  }
}
