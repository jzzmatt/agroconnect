import { isUuid } from "@/lib/commerce/ids";
import { NotificationService } from "@/lib/services/notification-service";
import type { OrderDescriptor } from "@/types/commerce";

async function seedProfileId(providerId: string): Promise<string | null> {
  const [{ INITIAL_SELLERS }, { INITIAL_PROVIDERS }] = await Promise.all([
    import("@/lib/services/shopping-service"),
    import("@/lib/services/marketplace-service"),
  ]);
  return (
    INITIAL_SELLERS.find((seller) => seller.id === providerId)?.profile_id ||
    INITIAL_PROVIDERS.find((provider) => provider.id === providerId)?.profile_id ||
    null
  );
}

export async function resolveProviderProfileIds(providerIds: string[]): Promise<string[]> {
  const ids = [...new Set(providerIds.map((id) => String(id || "").trim()).filter(Boolean))];
  const profiles = new Set<string>();
  const unmatched: string[] = [];

  for (const id of ids) {
    const profileId = await seedProfileId(id);
    if (profileId) profiles.add(profileId);
    else if (isUuid(id)) unmatched.push(id);
  }

  if (unmatched.length === 0 || process.env.VITEST || process.env.VITEST_WORKER_ID) {
    return [...profiles];
  }

  try {
    const { tryCreateAdminSupabaseClient } = await import("@/lib/supabase/admin");
    const admin = tryCreateAdminSupabaseClient();
    if (!admin) return [...profiles];
    const { data } = await (admin.from("provider_profiles") as any)
      .select("profile_id")
      .in("id", unmatched);
    for (const row of data || []) {
      if (row?.profile_id) profiles.add(String(row.profile_id));
    }
  } catch (error) {
    console.warn("[resolveProviderProfileIds]", error);
  }

  return [...profiles];
}

export async function notifySellerInbox(params: {
  profileId: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string;
  status?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  if (!params.profileId) return;
  try {
    await NotificationService.createNotification(
      {
        profileId: params.profileId,
        type: params.type,
        title: params.title,
        message: params.message,
        linkUrl: params.linkUrl,
        data: {
          status: params.status || "pending",
          ...(params.data || {}),
        },
      },
      { persist: true }
    );
  } catch (error) {
    console.warn("[notifySellerInbox]", error);
  }
}

export async function notifyProviderOwners(params: {
  providerIds: string[];
  type: string;
  title: string;
  message: string;
  linkUrl: string;
  status?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const profileIds = await resolveProviderProfileIds(params.providerIds);
  await Promise.all(
    profileIds.map((profileId) =>
      notifySellerInbox({
        profileId,
        type: params.type,
        title: params.title,
        message: params.message,
        linkUrl: params.linkUrl,
        status: params.status,
        data: params.data,
      })
    )
  );
}

export async function notifyReceivedProductOrders(order: OrderDescriptor): Promise<void> {
  const sellerIds = [
    ...new Set(
      order.items
        .filter((item) => item.product_id && item.seller_id)
        .map((item) => item.seller_id)
    ),
  ];
  if (sellerIds.length === 0) return;

  await Promise.all(
    sellerIds.map(async (sellerId) => {
      const titles = order.items
        .filter((item) => item.seller_id === sellerId && item.product_id)
        .map((item) => item.product_title)
        .filter(Boolean)
        .slice(0, 2);
      await notifyProviderOwners({
        providerIds: [sellerId],
        type: "order.received",
        title: `Nova encomenda #${order.order_number}`,
        message: titles.length > 0 ? titles.join(", ") : "Recebeu uma encomenda de produto.",
        linkUrl: "/dashboard/orders",
        status: order.payment_status || order.status || "pending",
        data: { orderNumber: order.order_number },
      });
    })
  );
}
