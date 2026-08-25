import { redirect } from "next/navigation";
import {
  requireControlPanelAccess,
  type CapabilitySubject,
} from "@/lib/authorization/server";

/**
 * Ensures the signed-in user owns the AgriProfile workspace segment.
 * Unauthenticated visitors sign in; mismatched userId redirects to the
 * correct workspace.
 */
export async function requireWorkspaceAccess(
  userId: string
): Promise<CapabilitySubject> {
  const subject = await requireControlPanelAccess();
  if (subject.clerkUserId !== userId) {
    redirect(`/${subject.clerkUserId}/agriprofile`);
  }
  return subject;
}
