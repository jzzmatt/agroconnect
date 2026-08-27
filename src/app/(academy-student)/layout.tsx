import type { ReactNode } from "react";
import { requireAuthenticatedStudentAccess } from "@/lib/authorization/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function AcademyStudentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const subject = await requireAuthenticatedStudentAccess();
  return <DashboardShell initialPlan={subject.plan}>{children}</DashboardShell>;
}
