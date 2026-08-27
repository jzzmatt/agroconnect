import { redirect } from "next/navigation";

export default function TransportRequestsIndexPage() {
  redirect("/dashboard/transport/requests/receiving");
}
