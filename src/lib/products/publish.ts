import {
  createServerSupabaseClient,
  tryCreateAdminServerSupabaseClient,
} from "@/lib/supabase/server";
import { isUuid } from "@/lib/products/ids";
import { dbCondition, productTypeFromCategory } from "@/config/product-catalog";
import type { UserProfileWithRoles } from "@/types/domain";
import type { SubscriptionPlan } from "@/types/database";
import type { CreateProductInput } from "@/lib/services/shopping-service";

type WritableClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

async function writableClient(): Promise<WritableClient> {
  return tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());
}

export async function syncSubscriptionPlanRow(clerkUserId: string, plan: SubscriptionPlan) {
  const client = await writableClient();
  await (client.from("profiles") as any)
    .update({
      subscription_plan: plan,
      subscription_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", clerkUserId);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      (client as any).rpc("activate_user_subscription_plan", {
        p_clerk_user_id: clerkUserId,
        p_plan: plan,
      }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("PLAN_SYNC_TIMEOUT")), 3000);
      }),
    ]);
  } catch {
    // RPC may be missing or slow; memory-first plan still applies.
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function ensureSellerProfile(profile: UserProfileWithRoles) {
  let profileId = profile.id;
  const client = await writableClient();
  if (!isUuid(profileId)) {
    const { data: existingProfile } = await (client.from("profiles") as any)
      .select("id")
      .eq("clerk_user_id", profile.clerk_user_id)
      .maybeSingle();
    if (existingProfile?.id && isUuid(existingProfile.id)) {
      profileId = existingProfile.id;
    } else {
      const { data: createdProfile, error: profileError } = await (client.from("profiles") as any)
        .upsert(
          {
            clerk_user_id: profile.clerk_user_id,
            display_name: profile.display_name || "Utilizador",
            email: profile.email,
            phone: profile.phone,
            avatar_url: profile.avatar_url,
            preferred_language: profile.preferred_language || "pt",
            subscription_plan: profile.subscription_plan || "basic",
            status: "active",
            account_type: "customer",
            is_active: true,
          },
          { onConflict: "clerk_user_id" }
        )
        .select("id")
        .single();
      if (profileError || !isUuid(createdProfile?.id)) {
        throw new Error(profileError?.message || "Perfil de utilizador inválido. Sincronize a conta e tente novamente.");
      }
      profileId = createdProfile.id;
    }
  }
  const { data: existing } = await (client.from("provider_profiles") as any)
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (existing?.id && isUuid(existing.id)) return existing;

  const slugBase = (profile.display_name || "vendedor")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "vendedor";
  const { data: created, error } = await (client.from("provider_profiles") as any)
    .insert({
      profile_id: profileId,
      business_name: profile.display_name || "Meu Negócio Agrícola",
      slug: `${slugBase}-${String(profileId).slice(0, 8)}`,
      headline: "Vendedor AgriProduct",
      description: "Produtos agrícolas no AgriConnect.",
      provider_type: "individual",
      phone: profile.phone,
      email: profile.email,
      verification_status: "unverified",
      status: "active",
      latitude: -12.5,
      longitude: 17.5,
      service_radius_km: 50,
    })
    .select("*")
    .single();
  if (error || !created?.id) {
    throw new Error(error?.message || "Não foi possível criar o perfil de vendedor.");
  }
  return created;
}

export async function insertProductRow(params: {
  sellerId: string;
  input: CreateProductInput;
  metadata: Record<string, unknown>;
  categorySlug: string;
}) {
  if (!isUuid(params.sellerId)) {
    throw new Error("Perfil de vendedor inválido.");
  }
  const client = await writableClient();
  const productType = params.input.productType || productTypeFromCategory(params.categorySlug);
  const slugBase = params.input.title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "produto";
  const uniqueSlug = `${slugBase}-${Math.random().toString(36).slice(2, 8)}`;

  let categoryId = params.input.categoryId || null;
  if (!categoryId) {
    const { data: categoryRow } = await (client.from("categories") as any)
      .select("id")
      .eq("slug", params.categorySlug)
      .eq("category_type", "product")
      .maybeSingle();
    categoryId = categoryRow?.id || null;
  }

  const { data, error } = await (client.from("products") as any)
    .insert({
      seller_id: params.sellerId,
      category_id: categoryId,
      category_slug: params.categorySlug,
      product_type: productType,
      title: params.input.title.trim(),
      slug: uniqueSlug,
      description: params.input.description || "",
      condition: dbCondition(params.input.condition),
      price: params.input.price,
      currency: params.input.currency || "AOA",
      quantity: params.input.quantity ?? (params.metadata as any)?.animal?.quantity ?? 1,
      unit: params.input.unit || (params.metadata as any)?.animal?.unit || "unidade",
      sku: params.input.sku || null,
      availability_status: params.input.availabilityStatus || "in_stock",
      location_type: params.input.locationType || "physical_location",
      province_id: params.input.provinceId || null,
      municipality_id: params.input.municipalityId || null,
      latitude: params.input.latitude || null,
      longitude: params.input.longitude || null,
      selling_radius_km: params.input.sellingRadiusKm || 50,
      status: params.input.status === "paused" || params.input.status === "archived" ? params.input.status : "published",
      is_featured: params.input.isFeatured || false,
      metadata: params.metadata,
    })
    .select("*")
    .single();

  if (error || !data?.id || !isUuid(data.id)) {
    throw new Error(error?.message || "Não foi possível guardar o produto.");
  }
  return data;
}
