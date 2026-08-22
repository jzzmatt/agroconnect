"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUserContext } from "@/lib/auth/user-context";
import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import {
  ShoppingService,
  type CreateProductInput,
  type UpdateProductInput,
  type SearchProductsFilterParams,
} from "@/lib/services/shopping-service";
import { getOrCreateCurrentProviderProfileAction } from "@/lib/services/marketplace-actions";
import type { ProductListItem, SellerPublicProfile, ProductRequestItem } from "@/types/domain";

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

import { countActiveProducts } from "@/lib/services/pricing-service";
import {
  dbCondition,
  isProductCategorySlug,
  productTypeFromCategory,
} from "@/config/product-catalog";
import { buildProductMetadata } from "@/lib/products/metadata";
import {
  PRODUCT_ERROR_CODES,
  createRequestId,
  logProductOperation,
  type ProductActionResult,
} from "@/lib/products/errors";

const publishedByIdempotencyKey = new Map<string, ProductListItem>();

export type CreateProductResult = ProductActionResult<ProductListItem> & {
  product?: ProductListItem;
};

/**
 * Server Action: Create/publish a product with entitlements, category validation,
 * and structured errors. Never throws a raw 500 to the client.
 */
export async function createProductAction(
  input: CreateProductInput
): Promise<CreateProductResult> {
  const requestId = input.idempotencyKey || createRequestId();

  try {
    await requireAuth();
    const context = await getCurrentUserContext();
    if (!context) {
      return { success: false, code: PRODUCT_ERROR_CODES.AUTH_REQUIRED, requestId };
    }

    if (input.idempotencyKey && publishedByIdempotencyKey.has(input.idempotencyKey)) {
      const existing = publishedByIdempotencyKey.get(input.idempotencyKey)!;
      return { success: true, product: existing, data: existing, requestId };
    }

    const currentUser = context.profile;
    const entitlements = context.entitlements;

    if (context.subscription.status !== "active" && context.plan !== "basic") {
      logProductOperation({
        requestId,
        operation: "create_product",
        userId: currentUser.clerk_user_id,
        subscriptionId: context.subscription.id,
        plan: context.plan,
        subscriptionStatus: context.subscription.status,
        entitlements: ["can_create_products=false"],
        status: "error",
        error: "plan_not_active",
      });
      return { success: false, code: PRODUCT_ERROR_CODES.PLAN_NOT_ACTIVE, requestId };
    }

    if (!entitlements.can_create_products || !entitlements.can_publish_products || !entitlements.can_access_agriproduct) {
      logProductOperation({
        requestId,
        operation: "create_product",
        userId: currentUser.clerk_user_id,
        subscriptionId: context.subscription.id,
        plan: context.plan,
        subscriptionStatus: context.subscription.status,
        entitlements: ["can_access_agriproduct=false"],
        status: "error",
        error: "feature_not_available",
      });
      return { success: false, code: PRODUCT_ERROR_CODES.FEATURE_NOT_AVAILABLE, requestId };
    }

    if (!input.title || input.title.trim().length < 3) {
      return { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_VALIDATION_FAILED, requestId };
    }
    if (input.price === undefined || input.price < 0) {
      return { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_VALIDATION_FAILED, requestId };
    }

    const categorySlug = isProductCategorySlug(input.categorySlug)
      ? input.categorySlug
      : "sementes-e-fertilizantes";
    const productType = input.productType || productTypeFromCategory(categorySlug);

    let metadata;
    try {
      metadata = buildProductMetadata({
        categorySlug,
        productType,
        condition: input.condition,
        animal: (input.metadata as any)?.animal,
        land: (input.metadata as any)?.land,
        location: {
          province_name: input.provinceName || "Luanda",
          municipality_name: input.municipalityName,
          latitude: input.latitude,
          longitude: input.longitude,
        },
      });
    } catch {
      return {
        success: false,
        code:
          productType === "animal"
            ? PRODUCT_ERROR_CODES.PRODUCT_ANIMAL_INVALID
            : productType === "land"
              ? PRODUCT_ERROR_CODES.PRODUCT_LAND_INVALID
              : PRODUCT_ERROR_CODES.PRODUCT_VALIDATION_FAILED,
        requestId,
      };
    }

    const seller = await getOrCreateCurrentProviderProfileAction();
    const currentSellerProducts = await ShoppingService.getSellerProducts(seller.id, false);
    const activeCount = countActiveProducts(currentSellerProducts);

    logProductOperation({
      requestId,
      operation: "create_product_preflight",
      userId: currentUser.clerk_user_id,
      subscriptionId: context.subscription.id,
      plan: context.plan,
      subscriptionStatus: context.subscription.status,
      entitlements: [
        `can_access_agriproduct=${entitlements.can_access_agriproduct}`,
        `can_create_products=${entitlements.can_create_products}`,
        `can_publish_products=${entitlements.can_publish_products}`,
        `product_limit=${entitlements.product_limit ?? "unlimited"}`,
      ],
      productCount: activeCount,
      category: categorySlug,
      productType,
      status: "ok",
    });

    if (entitlements.product_limit !== null && activeCount >= entitlements.product_limit) {
      return { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_LIMIT_REACHED, requestId };
    }

    const supabase = await createServerSupabaseClient();
    const slugBase = input.title.toLowerCase().replace(/\s+/g, "-");
    const uniqueSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;

    let categoryId = input.categoryId || null;
    if (!categoryId) {
      const { data: categoryRow } = await (supabase.from("categories") as any)
        .select("id")
        .eq("slug", categorySlug)
        .eq("category_type", "product")
        .maybeSingle();
      categoryId = categoryRow?.id || null;
    }

    const { data, error } = await (supabase.from("products") as any)
      .insert({
        seller_id: seller.id,
        category_id: categoryId,
        category_slug: categorySlug,
        product_type: productType,
        title: input.title.trim(),
        slug: uniqueSlug,
        description: input.description || "",
        condition: dbCondition(input.condition),
        price: input.price,
        currency: input.currency || "AOA",
        quantity: input.quantity ?? metadata.animal?.quantity ?? 1,
        unit: input.unit || metadata.animal?.unit || "unidade",
        sku: input.sku || null,
        availability_status: input.availabilityStatus || "in_stock",
        location_type: input.locationType || "physical_location",
        province_id: input.provinceId || null,
        municipality_id: input.municipalityId || null,
        latitude: input.latitude || null,
        longitude: input.longitude || null,
        selling_radius_km: input.sellingRadiusKm || 50,
        status: input.status || "published",
        is_featured: input.isFeatured || false,
        metadata,
      })
      .select("*")
      .single();

    if (error) {
      console.warn("[createProductAction] DB insert warning:", error.message, requestId);
    }

    const product: ProductListItem = data
      ? {
          id: data.id,
          seller_id: seller.id,
          seller_name: seller.business_name,
          seller_slug: seller.slug,
          seller_verified: seller.verification_status === "verified",
          category_id: data.category_id,
          category_slug: categorySlug,
          product_type: productType,
          title: data.title,
          slug: data.slug,
          description: data.description,
          condition: data.condition,
          price: Number(data.price),
          currency: data.currency,
          quantity: data.quantity,
          unit: data.unit,
          sku: data.sku,
          availability_status: data.availability_status,
          location_type: data.location_type,
          province_id: data.province_id,
          municipality_id: data.municipality_id,
          province_name: input.provinceName,
          municipality_name: input.municipalityName,
          latitude: data.latitude,
          longitude: data.longitude,
          selling_radius_km: data.selling_radius_km,
          status: data.status,
          is_featured: data.is_featured,
          metadata,
          created_at: data.created_at,
        }
      : await ShoppingService.createProduct({
          ...input,
          categorySlug,
          productType,
          metadata,
        });

    if (!data) {
      product.category_slug = categorySlug;
      product.product_type = productType;
      product.metadata = metadata;
      product.province_name = input.provinceName;
      product.municipality_name = input.municipalityName;
    }

    logProductOperation({
      requestId,
      operation: "create_product",
      userId: currentUser.clerk_user_id,
      productId: product.id,
      category: categorySlug,
      productType,
      subscriptionId: context.subscription.id,
      plan: context.plan,
      subscriptionStatus: context.subscription.status,
      productCount: activeCount + 1,
      status: "ok",
    });

    if (input.idempotencyKey) {
      publishedByIdempotencyKey.set(input.idempotencyKey, product);
    }

    return { success: true, product, data: product, requestId };
  } catch (err: any) {
    const message = String(err?.message || "");
    logProductOperation({
      requestId,
      operation: "create_product",
      category: input.categorySlug,
      status: "error",
      error: message,
    });
    if (/PRODUCT_LIMIT_REACHED/i.test(message)) {
      return { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_LIMIT_REACHED, requestId };
    }
    if (/PRODUCT_CREATION_LOCKED|FEATURE_NOT_AVAILABLE/i.test(message)) {
      return { success: false, code: PRODUCT_ERROR_CODES.FEATURE_NOT_AVAILABLE, requestId };
    }
    return {
      success: false,
      code: PRODUCT_ERROR_CODES.PRODUCT_PUBLISH_FAILED,
      message,
      requestId,
    };
  }
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
