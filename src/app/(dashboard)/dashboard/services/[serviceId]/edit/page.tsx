import { notFound } from "next/navigation";
import { ServiceEditor } from "@/components/marketplace/ServiceEditor";
import { getMyServiceAction } from "@/lib/services/marketplace-actions";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const service = await getMyServiceAction(serviceId);
  if (!service) notFound();

  return <ServiceEditor service={service} />;
}
