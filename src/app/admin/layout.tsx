import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin/access";
import { writeAdminAudit } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await requireAdmin();
  await writeAdminAudit({
    actorProfileId: actor.profileId,
    action: "admin.access",
    entityType: "admin_console",
    metadata: { path: "/admin" },
  });

  return <AdminShell>{children}</AdminShell>;
}
