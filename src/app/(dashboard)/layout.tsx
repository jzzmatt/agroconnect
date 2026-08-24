import type { ReactNode } from "react";
import { requireControlPanelAccess } from "@/lib/authorization/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const subject = await requireControlPanelAccess();
  return <DashboardShell initialPlan={subject.plan}>{children}</DashboardShell>;
}
