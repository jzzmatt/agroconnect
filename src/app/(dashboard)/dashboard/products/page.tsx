import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth/user-context";
import { getMyProductStatsAction } from "@/lib/services/shopping-actions";
import { ProductsDashboardClient } from "@/components/shopping/ProductsDashboardClient";

export const dynamic = "force-dynamic";

export default async function MyProductsDashboardPage() {
  const [context, stats] = await Promise.all([
    getCurrentUserContext(),
    getMyProductStatsAction(),
  ]);

  if (!context) {
    redirect("/sign-in");
  }

  return (
    <ProductsDashboardClient
      initialProducts={stats.products}
      entitlements={context.entitlements}
    />
  );
}
