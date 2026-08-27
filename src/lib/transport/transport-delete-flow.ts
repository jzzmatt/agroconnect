import type { TransportPublicationStatus } from "@/types/transport";

export type TransportDeleteDialogKind = "confirm_delete" | "published_block" | "confirm_after_pause";

export function canPermanentlyDeleteTransport(status: TransportPublicationStatus): boolean {
  return status === "draft" || status === "paused" || status === "archived";
}

export function deleteDialogForTransportStatus(
  status: TransportPublicationStatus
): TransportDeleteDialogKind {
  if (status === "published") return "published_block";
  return "confirm_delete";
}
