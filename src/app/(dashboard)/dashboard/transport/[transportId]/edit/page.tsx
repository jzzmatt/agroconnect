import { notFound } from "next/navigation";
import { TransportEditor } from "@/components/transport/TransportEditor";
import { getOwnedTransportByIdAction } from "@/lib/transport/transport-actions";

export default async function EditTransportPage({
  params,
}: {
  params: Promise<{ transportId: string }>;
}) {
  const { transportId } = await params;
  const transport = await getOwnedTransportByIdAction(transportId);
  if (!transport) notFound();

  return <TransportEditor transport={transport} />;
}
