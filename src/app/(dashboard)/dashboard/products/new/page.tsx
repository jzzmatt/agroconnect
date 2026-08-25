import { redirect } from "next/navigation";
import { requireControlPanelAccess } from "@/lib/authorization/server";
import { agriprofilePath } from "@/lib/agriprofile/paths";

export default async function LegacyNewProductRedirect() {
  const subject = await requireControlPanelAccess();
  redirect(agriprofilePath(subject.clerkUserId, "products/new"));
}
