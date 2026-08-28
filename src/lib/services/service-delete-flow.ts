export type ServiceDeleteDialogKind = "confirm_delete" | "published_block";

/**
 * Published marketplace services must be paused or archived before they can
 * be removed. Draft, paused and archived rows may be deleted.
 * Legacy `active` is treated as published.
 */
export function canPermanentlyDeleteService(status: string | null | undefined): boolean {
  return status === "draft" || status === "paused" || status === "archived";
}

export function deleteDialogForServiceStatus(
  status: string | null | undefined
): ServiceDeleteDialogKind {
  return canPermanentlyDeleteService(status) ? "confirm_delete" : "published_block";
}
