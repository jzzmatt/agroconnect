import { redirect } from "next/navigation";
import { can, requireControlPanelAccess } from "@/lib/authorization/server";
import { TransportRequestsPanel } from "@/components/transport/TransportRequestsPanel";

export default async function ReceivingTransportRequestsPage() {
  const subject = await requireControlPanelAccess();
  if (!can(subject, "service.manage")) {
    redirect("/planos");
  }

  return <TransportRequestsPanel view="receiving" />;
}
