import { getMyProductStatsAction } from "@/lib/services/shopping-actions";
import { ProductsDashboardClient } from "./ProductsDashboardClient";

export const dynamic = "force-dynamic";

export default async function MyProductsDashboardPage() {
  const stats = await getMyProductStatsAction();

  return <ProductsDashboardClient initialProducts={stats.products} />;
}
