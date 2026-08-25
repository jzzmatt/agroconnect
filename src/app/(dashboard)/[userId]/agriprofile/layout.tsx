import type { ReactNode } from "react";
import { requireWorkspaceAccess } from "@/lib/agriprofile/workspace-server";

export default async function AgriProfileWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  await requireWorkspaceAccess(userId);
  return children;
}
