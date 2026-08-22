"use server";

import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import {
  ProductMediaService,
  validateProductImage,
  buildProductImageAlt,
  type ProductImageDescriptor,
} from "@/lib/services/product-media-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function uploadProductImageAction(params: {
  productId: string;
  productTitle: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
  dataUrl: string;
  isPrimary?: boolean;
}): Promise<{ success: boolean; image?: ProductImageDescriptor; error?: string }> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) return { success: false, error: "Não autorizado." };

    const entitlements = getUserEntitlements({ subscriptionPlan: profile.subscription_plan });
    if (!entitlements.can_upload_product_images) {
      return { success: false, error: "O carregamento de imagens está disponível a partir do plano Profissional." };
    }

    const validation = validateProductImage({
      mimeType: params.mimeType,
      fileSize: params.fileSize,
      fileName: params.fileName,
    });
    if (!validation.ok) return { success: false, error: validation.error };

    if (!params.dataUrl.startsWith("data:image/")) {
      return { success: false, error: "Imagem inválida." };
    }

    const image = ProductMediaService.add({
      productId: params.productId,
      ownerId: profile.id,
      url: params.dataUrl,
      mimeType: params.mimeType as "image/jpeg" | "image/png" | "image/webp",
      fileSize: params.fileSize,
      altText: buildProductImageAlt(params.productTitle),
      isPrimary: params.isPrimary,
    });

    try {
      const supabase = await createServerSupabaseClient();
      await (supabase.from("product_images") as any).insert({
        id: image.id,
        product_id: params.productId,
        owner_id: profile.id,
        storage_provider: "local",
        storage_path: `products/${params.productId}/${image.id}`,
        url: image.url,
        alt_text: image.alt_text,
        mime_type: image.mime_type,
        file_size: image.file_size,
        sort_order: image.sort_order,
        is_primary: image.is_primary,
      });
      if (image.is_primary) {
        await (supabase.from("products") as any)
          .update({ primary_image_url: image.url })
          .eq("id", params.productId);
      }
    } catch {
      // metadata persistence is best-effort in sandbox
    }

    return { success: true, image };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao carregar imagem." };
  }
}

export async function listProductImagesAction(productId: string): Promise<ProductImageDescriptor[]> {
  return ProductMediaService.list(productId);
}

export async function deleteProductImageAction(productId: string, imageId: string): Promise<boolean> {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) return false;
  const entitlements = getUserEntitlements({ subscriptionPlan: profile.subscription_plan });
  if (!entitlements.can_upload_product_images) return false;
  return ProductMediaService.remove(productId, imageId, profile.id);
}

export async function setPrimaryProductImageAction(productId: string, imageId: string): Promise<boolean> {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) return false;
  return ProductMediaService.setPrimary(productId, imageId, profile.id);
}
