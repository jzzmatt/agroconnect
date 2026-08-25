import { redirect } from "next/navigation";
import { requireControlPanelAccess } from "@/lib/authorization/server";
import { agriprofilePath } from "@/lib/agriprofile/paths";

export default async function LegacyProductsRedirect() {
  const subject = await requireControlPanelAccess();
  redirect(agriprofilePath(subject.clerkUserId, "products"));
}
