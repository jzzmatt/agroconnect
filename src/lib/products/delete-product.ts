import { getCurrentUserContext } from "@/lib/auth/user-context";
import { requireAuth } from "@/lib/clerk/auth";
import { getOrCreateCurrentProviderProfileAction } from "@/lib/services/marketplace-actions";
import {
  PRODUCT_ERROR_CODES,
  createRequestId,
  logProductOperation,
  type ProductActionResult,
} from "@/lib/products/errors";
import { isUuid } from "@/lib/products/ids";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DeleteProductResult = ProductActionResult<{ productId: string }>;

/**
 * Soft-deletes a product owned by the current seller.
 *
 * Sets `status = deleted` so historical orders keep their snapshot while the
 * catalog and marketplace search stop returning the row. Associated video rows
 * are marked deleted; the primary image URL is cleared from the product.
 */
export async function softDeleteProduct(productId: string): Promise<DeleteProductResult> {
  const requestId = createRequestId();

  try {
    await requireAuth();

    if (!isSupabaseConfigured()) {
      return { success: false, code: PRODUCT_ERROR_CODES.SUPABASE_NOT_CONFIGURED, requestId };
    }

    if (!isUuid(productId)) {
      return { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_NOT_FOUND, requestId };
    }

    const context = await getCurrentUserContext();
    if (!context) {
      return { success: false, code: PRODUCT_ERROR_CODES.AUTH_REQUIRED, requestId };
    }

    if (!context.entitlements.can_access_agriproduct) {
      return { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_DELETE_FORBIDDEN, requestId };
    }

    const seller = await getOrCreateCurrentProviderProfileAction();
    const supabase = (await createServerSupabaseClient()) as any;

    const { data: product, error: loadError } = await supabase
      .from("products")
      .select("id,seller_id,status,title")
      .eq("id", productId)
      .maybeSingle();

    if (loadError || !product) {
      return { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_NOT_FOUND, requestId };
    }

    if (product.seller_id !== seller.id) {
      return { success: false, code: PRODUCT_ERROR_CODES.NOT_OWNER, requestId };
    }

    if (product.status === "deleted") {
      return { success: true, requestId, data: { productId } };
    }

    const admin = tryCreateAdminSupabaseClient();
    const mediaClient = admin || supabase;

    await Promise.all([
      mediaClient
        .from("product_videos")
        .update({ status: "deleted", updated_at: new Date().toISOString() })
        .eq("product_id", productId),
      mediaClient.from("product_images").delete().eq("product_id", productId),
    ]);

    const { error: updateError } = await supabase
      .from("products")
      .update({
        status: "deleted",
        primary_image_url: null,
        product_video_id: null,
        is_featured: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .eq("seller_id", seller.id);

    if (updateError) {
      logProductOperation({
        requestId,
        operation: "delete_product",
        userId: context.profile.clerk_user_id,
        productId,
        status: "error",
        error: updateError.message,
      });
      return { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_DELETE_FAILED, requestId };
    }

    logProductOperation({
      requestId,
      operation: "delete_product",
      userId: context.profile.clerk_user_id,
      productId,
      status: "ok",
    });

    return { success: true, requestId, data: { productId } };
  } catch (err: any) {
    logProductOperation({
      requestId,
      operation: "delete_product",
      productId,
      status: "error",
      error: err?.message,
    });
    return {
      success: false,
      code: PRODUCT_ERROR_CODES.PRODUCT_DELETE_FAILED,
      message: err?.message,
      requestId,
    };
  }
}
