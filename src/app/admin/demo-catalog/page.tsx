import { DemoCatalogManager } from "@/components/admin/DemoCatalogManager";
import { loadDemoCatalogAdmin } from "@/lib/admin/data";
import { getAdminDictionary } from "@/lib/admin/locale";

export default async function AdminDemoCatalogPage() {
  const { dict } = await getAdminDictionary();
  const catalog = await loadDemoCatalogAdmin();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{dict.admin.demoCatalog}</h1>
      <DemoCatalogManager enabled={catalog.enabled} batches={catalog.batches} removableCount={catalog.removableCount} />
    </div>
  );
}
