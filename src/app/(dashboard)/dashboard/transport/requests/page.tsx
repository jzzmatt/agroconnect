import { redirect } from "next/navigation";
import { can, requireControlPanelAccess } from "@/lib/authorization/server";
import { TRANSPORT_RECEIVING_REQUESTS_PATH, TRANSPORT_SENDING_REQUESTS_PATH } from "@/lib/transport/transport-request-lifecycle";

export default async function TransportRequestsIndexPage() {
  const subject = await requireControlPanelAccess();
  if (can(subject, "service.manage")) {
    redirect(TRANSPORT_RECEIVING_REQUESTS_PATH);
  }
  redirect(TRANSPORT_SENDING_REQUESTS_PATH);
}
