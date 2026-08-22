import { getCurrentUserContext } from "@/lib/auth/user-context";
import { requireAuth } from "@/lib/clerk/auth";
import { ShoppingService, type CreateProductInput } from "@/lib/services/shopping-service";
import { countActiveProducts } from "@/lib/services/pricing-service";
import {
  isProductCategorySlug,
  productTypeFromCategory,
} from "@/config/product-catalog";
import { buildProductMetadata } from "@/lib/products/metadata";
import {
  ensureSellerProfile,
  insertProductRow,
  syncSubscriptionPlanRow,
} from "@/lib/products/publish";
import { isUuid } from "@/lib/products/ids";
import {
  describeSupabaseError,
  describeSupabaseReachability,
  isTransientSupabaseError,
} from "@/lib/supabase/retry";
import {
  PRODUCT_ERROR_CODES,
  createRequestId,
  logProductOperation,
  type ProductActionResult,
} from "@/lib/products/errors";
import type { ProductListItem } from "@/types/domain";

const publishedByIdempotencyKey = new Map<string, ProductListItem>();

export type CreateProductResult = ProductActionResult<ProductListItem> & {
  product?: ProductListItem;
};

export async function createPublishedProduct(
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

    if (context.plan !== "basic") {
      await syncSubscriptionPlanRow(currentUser.clerk_user_id, context.plan).catch(() => undefined);
    }

    const sellerRow = await ensureSellerProfile(currentUser);
    const currentSellerProducts = await ShoppingService.getSellerProducts(sellerRow.id, false);
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

    const data = await insertProductRow({
      sellerId: sellerRow.id,
      input: { ...input, categorySlug, productType, metadata, status: "published" },
      metadata,
      categorySlug,
    });

    if (!isUuid(data.id)) {
      return { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_PUBLISH_FAILED, requestId };
    }

    const product: ProductListItem = {
      id: data.id,
      seller_id: sellerRow.id,
      seller_name: sellerRow.business_name,
      seller_slug: sellerRow.slug,
      seller_verified: sellerRow.verification_status === "verified",
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
    };

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
  } catch (err: unknown) {
    const message = describeSupabaseError(err) || String(err || "");
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
    // A dropped connection to Supabase is not a validation or plan problem;
    // telling the user it is a network fault is what they can act on.
    if (isTransientSupabaseError(err)) {
      const reachability = await describeSupabaseReachability();
      console.error("[product] supabase unreachable:", { message, reachability, requestId });
      return {
        success: false,
        code: PRODUCT_ERROR_CODES.NETWORK_FAILED,
        message: `${message} (Supabase: ${reachability})`,
        requestId,
      };
    }
    return {
      success: false,
      code: PRODUCT_ERROR_CODES.PRODUCT_PUBLISH_FAILED,
      message,
      requestId,
    };
  }
}
