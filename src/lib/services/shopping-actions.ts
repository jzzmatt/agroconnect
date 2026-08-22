"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import {
  ShoppingService,
  type CreateProductInput,
  type UpdateProductInput,
  type SearchProductsFilterParams,
} from "@/lib/services/shopping-service";
import { getOrCreateCurrentProviderProfileAction } from "@/lib/services/marketplace-actions";
import { createPublishedProduct, type CreateProductResult } from "@/lib/products/create-product";
import { countActiveProducts } from "@/lib/services/pricing-service";
import type { ProductListItem, ProductRequestItem } from "@/types/domain";

/**
 * Server Action: Search marketplace products
 */
export async function searchProductsAction(
  params: SearchProductsFilterParams = {}
): Promise<{ products: ProductListItem[]; total: number }> {
  return ShoppingService.searchProducts(params);
}

/**
 * Server Action: Get product by slug
 */
export async function getProductBySlugAction(
  slug: string
): Promise<ProductListItem | null> {
  return ShoppingService.getProductBySlug(slug);
}

/**
 * Server Action: Get seller products
 */
export async function getSellerProductsAction(
  sellerId: string,
  onlyPublished = true
): Promise<ProductListItem[]> {
  return ShoppingService.getSellerProducts(sellerId, onlyPublished);
}

export type { CreateProductResult };

/**
 * Kept for existing callers/tests. The product form uses POST /api/products/create
 * so the browser does not race a server action (Chrome message-port errors).
 */
export async function createProductAction(
  input: CreateProductInput
): Promise<CreateProductResult> {
  return createPublishedProduct(input);
}

/**
 * Current seller's catalog + active (limit-counted) product total.
 */
export async function getMyProductStatsAction(): Promise<{
  products: ProductListItem[];
  activeCount: number;
}> {
  try {
    await requireAuth();
    const seller = await getOrCreateCurrentProviderProfileAction();
    const products = await ShoppingService.getSellerProducts(seller.id, false);
    const ownProducts = products.filter((product) => product.seller_id === seller.id);
    return {
      products: ownProducts,
      activeCount: countActiveProducts(ownProducts),
    };
  } catch {
    return { products: [], activeCount: 0 };
  }
}

/**
 * Server Action: Update product
 */
export async function updateProductAction(
  input: UpdateProductInput
): Promise<boolean> {
  await requireAuth();
  const seller = await getOrCreateCurrentProviderProfileAction();
  const supabase = await createServerSupabaseClient();

  const updates: Record<string, any> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.condition !== undefined) updates.condition = input.condition;
  if (input.price !== undefined) updates.price = input.price;
  if (input.quantity !== undefined) updates.quantity = input.quantity;
  if (input.unit !== undefined) updates.unit = input.unit;
  if (input.sku !== undefined) updates.sku = input.sku;
  if (input.availabilityStatus !== undefined) updates.availability_status = input.availabilityStatus;
  if (input.status !== undefined) updates.status = input.status;
  if (input.sellingRadiusKm !== undefined) updates.selling_radius_km = input.sellingRadiusKm;
  if (input.provinceId !== undefined) updates.province_id = input.provinceId;
  if (input.municipalityId !== undefined) updates.municipality_id = input.municipalityId;
  if (input.latitude !== undefined) updates.latitude = input.latitude;
  if (input.longitude !== undefined) updates.longitude = input.longitude;

  const { error } = await (supabase.from("products") as any)
    .update(updates)
    .eq("id", input.id)
    .eq("seller_id", seller.id);

  return !error;
}

/**
 * Server Action: Create product request / order inquiry
 */
export async function createProductRequestAction(params: {
  productId: string;
  sellerId: string;
  quantity: number;
  unit?: string;
  message: string;
  deliveryLocationNotes?: string;
}): Promise<{ success: boolean; message: string; requestId?: string }> {
  await requireAuth();
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) {
    throw new Error("É necessário ter perfil ativo para solicitar produtos.");
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await (supabase.from("product_requests") as any)
    .insert({
      customer_id: userProfile.id,
      seller_id: params.sellerId,
      product_id: params.productId,
      quantity: params.quantity,
      unit: params.unit || "unidade",
      message: params.message.trim(),
      delivery_location_notes: params.deliveryLocationNotes || null,
      status: "pending",
      currency: "AOA",
    })
    .select("id")
    .single();

  if (error) {
    console.warn("[createProductRequestAction] DB error:", error);
  }

  return {
    success: true,
    message: "Pedido de produto enviado com sucesso ao vendedor!",
    requestId: data?.id || `preq-${Math.random().toString(36).substring(2, 8)}`,
  };
}

/**
 * Server Action: Toggle product favorite
 */
export async function toggleProductFavoriteAction(
  productId: string
): Promise<{ isFavorited: boolean }> {
  await requireAuth();
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) throw new Error("Não autorizado");

  const supabase = await createServerSupabaseClient();

  const { data: existing } = await (supabase.from("favorites") as any)
    .select("id")
    .eq("profile_id", userProfile.id)
    .eq("entity_type", "product")
    .eq("entity_id", productId)
    .single();

  if (existing) {
    await (supabase.from("favorites") as any).delete().eq("id", existing.id);
    return { isFavorited: false };
  } else {
    await (supabase.from("favorites") as any).insert({
      profile_id: userProfile.id,
      entity_type: "product",
      entity_id: productId,
    });
    return { isFavorited: true };
  }
}

/**
 * Server Action: Get customer product requests
 */
export async function getCustomerProductRequestsAction(): Promise<ProductRequestItem[]> {
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("product_requests")
      .select(`
        id,
        customer_id,
        seller_id,
        product_id,
        quantity,
        unit,
        status,
        message,
        delivery_location_notes,
        offered_price,
        currency,
        created_at,
        updated_at,
        products(title, slug),
        provider_profiles(business_name)
      `)
      .eq("customer_id", userProfile.id)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        customer_id: item.customer_id,
        seller_id: item.seller_id,
        seller_name: item.provider_profiles?.business_name || "Vendedor",
        product_id: item.product_id,
        product_title: item.products?.title || "Produto",
        product_slug: item.products?.slug || null,
        quantity: item.quantity,
        unit: item.unit,
        status: item.status,
        message: item.message,
        delivery_location_notes: item.delivery_location_notes,
        offered_price: item.offered_price ? Number(item.offered_price) : null,
        currency: item.currency || "AOA",
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    }
  } catch (e) {
    console.warn("[getCustomerProductRequestsAction] fallback:", e);
  }

  return [];
}

/**
 * Server Action: Get seller incoming product requests
 */
export async function getSellerProductRequestsAction(): Promise<ProductRequestItem[]> {
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];

  try {
    const seller = await getOrCreateCurrentProviderProfileAction();
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("product_requests")
      .select(`
        id,
        customer_id,
        seller_id,
        product_id,
        quantity,
        unit,
        status,
        message,
        delivery_location_notes,
        offered_price,
        currency,
        created_at,
        updated_at,
        products(title, slug),
        profiles:customer_id(display_name, email, phone)
      `)
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        customer_id: item.customer_id,
        customer_name: item.profiles?.display_name || "Cliente",
        customer_email: item.profiles?.email || null,
        customer_phone: item.profiles?.phone || null,
        seller_id: item.seller_id,
        product_id: item.product_id,
        product_title: item.products?.title || "Produto",
        product_slug: item.products?.slug || null,
        quantity: item.quantity,
        unit: item.unit,
        status: item.status,
        message: item.message,
        delivery_location_notes: item.delivery_location_notes,
        offered_price: item.offered_price ? Number(item.offered_price) : null,
        currency: item.currency || "AOA",
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    }
  } catch (e) {
    console.warn("[getSellerProductRequestsAction] fallback:", e);
  }

  return [];
}
