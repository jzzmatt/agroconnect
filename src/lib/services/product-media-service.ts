import type { ProductImageDescriptor } from "@/types/media";
import { buildProductImageAlt, validateProductImage } from "@/lib/products/product-image-validation";
import { getMediaSupabaseClient } from "@/lib/media/db";
import { deleteImageKitFile } from "@/lib/media/imagekit";
import { SUPABASE_STORAGE_PROVIDER } from "@/lib/media/supabase-buckets";
import type { Database } from "@/types/database";

export type { ProductImageDescriptor };
export { validateProductImage, buildProductImageAlt };

const TABLE = "product_images";

type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];

function toDescriptor(row: ProductImageRow): ProductImageDescriptor {
  return {
    id: row.id,
    product_id: row.product_id,
    owner_id: row.owner_id,
    url: row.url,
    storage_provider: row.storage_provider,
    storage_path: row.storage_path,
    alt_text: row.alt_text || "",
    mime_type: row.mime_type,
    file_size: row.file_size,
    sort_order: row.sort_order,
    is_primary: row.is_primary,
    created_at: row.created_at,
  };
}

/**
 * Supabase-backed (`product_images`), ImageKit-backed for the binary. No
 * module-level Map — every list/add/remove round-trips the database, and the
 * bytes always go to ImageKit, never to Supabase Storage.
 */
export class ProductMediaService {
  public static async list(productId: string): Promise<ProductImageDescriptor[]> {
    const supabase = getMediaSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true });
    if (error) throw Object.assign(new Error(error.message), { code: "PRODUCT_IMAGE_READ_FAILED" });
    const rows = (data || []) as ProductImageRow[];
    return Promise.all(
      rows.map(async (row) => {
        const descriptor = toDescriptor(row);
        const displayUrl = await this.resolveImageDisplayUrl(descriptor);
        return { ...descriptor, url: displayUrl || descriptor.url || "" };
      })
    );
  }

  public static async primaryUrl(productId: string): Promise<string | null> {
    const images = await this.list(productId);
    return images.find((i) => i.is_primary)?.url || images[0]?.url || null;
  }

  public static async prepareImageUpload(params: {
    productId: string;
    ownerId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }) {
    const validation = validateProductImage({
      mimeType: params.mimeType,
      fileSize: params.fileSize,
      fileName: params.fileName,
    });
    if (!validation.ok) {
      throw Object.assign(new Error(validation.error), { code: "PRODUCT_IMAGE_FAILED" });
    }

    const storage = await import("@/lib/media/product-media-storage.server");
    const storagePath = storage.buildProductImageStoragePath({
      ownerId: params.ownerId,
      productId: params.productId,
      fileName: params.fileName,
    });
    const signed = await storage.productImageSignedUpload(storagePath);
    return { storagePath, signedUrl: signed.signedUrl, token: signed.token, mimeType: params.mimeType };
  }

  public static async completeImageUpload(params: {
    productId: string;
    ownerId: string;
    storagePath: string;
    fileName: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    fileSize: number;
    altText: string;
    isPrimary?: boolean;
  }): Promise<ProductImageDescriptor> {
    const expectedPrefix = `${params.ownerId}/${params.productId}/images/`;
    if (!params.storagePath.startsWith(expectedPrefix)) {
      const storage = await import("@/lib/media/product-media-storage.server");
      await storage.removeProductImageObject(params.storagePath);
      throw Object.assign(new Error("Invalid storage path."), { code: "PRODUCT_IMAGE_FAILED" });
    }

    const storage = await import("@/lib/media/product-media-storage.server");
    const exists = await storage.productImageObjectExists(params.storagePath);
    if (!exists) {
      throw Object.assign(new Error("Upload not found in storage."), { code: "PRODUCT_IMAGE_FAILED" });
    }

    const supabase = getMediaSupabaseClient();
    const existing = await this.list(params.productId);
    const isPrimary = params.isPrimary || existing.length === 0;

    if (isPrimary && existing.length > 0) {
      await (supabase.from(TABLE) as any).update({ is_primary: false }).eq("product_id", params.productId);
    }

    const { data, error } = await (supabase.from(TABLE) as any)
      .insert({
        product_id: params.productId,
        owner_id: params.ownerId,
        storage_provider: SUPABASE_STORAGE_PROVIDER,
        storage_path: params.storagePath,
        external_id: null,
        url: null,
        alt_text: params.altText,
        mime_type: params.mimeType,
        file_size: params.fileSize,
        sort_order: existing.length,
        is_primary: isPrimary,
      })
      .select()
      .single();

    if (error || !data) {
      await storage.removeProductImageObject(params.storagePath);
      throw Object.assign(new Error(error?.message || "Não foi possível guardar a imagem."), {
        code: "PRODUCT_IMAGE_INSERT_FAILED",
      });
    }

    if (isPrimary) {
      await (supabase.from("products") as any)
        .update({ primary_image_url: `/api/products/${params.productId}/primary-image` })
        .eq("id", params.productId);
    }

    const descriptor = toDescriptor(data as ProductImageRow);
    const display = await this.resolveImageDisplayUrl(descriptor);
    return { ...descriptor, url: display || descriptor.url };
  }

  public static async resolveImageDisplayUrl(
    image: Pick<ProductImageDescriptor, "url" | "storage_path" | "storage_provider">
  ): Promise<string | null> {
    if (image.storage_provider === SUPABASE_STORAGE_PROVIDER && image.storage_path) {
      try {
        const storage = await import("@/lib/media/product-media-storage.server");
        const { signedUrl } = await storage.productImageSignedDisplay(image.storage_path);
        return signedUrl;
      } catch {
        return image.url || null;
      }
    }
    return image.url || null;
  }

  public static async add(params: {
    productId: string;
    ownerId: string;
    buffer: Buffer;
    fileName: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    fileSize: number;
    altText: string;
    isPrimary?: boolean;
  }): Promise<ProductImageDescriptor> {
    const storage = await import("@/lib/media/product-media-storage.server");
    const storagePath = storage.buildProductImageStoragePath({
      ownerId: params.ownerId,
      productId: params.productId,
      fileName: params.fileName,
    });

    try {
      await storage.uploadProductImageBuffer({
        storagePath,
        buffer: params.buffer,
        contentType: params.mimeType,
      });
    } catch (uploadError) {
      throw Object.assign(
        new Error(uploadError instanceof Error ? uploadError.message : "Não foi possível carregar a imagem."),
        { code: "PRODUCT_IMAGE_FAILED" }
      );
    }

    return this.completeImageUpload({
      productId: params.productId,
      ownerId: params.ownerId,
      storagePath,
      fileName: params.fileName,
      mimeType: params.mimeType,
      fileSize: params.fileSize,
      altText: params.altText,
      isPrimary: params.isPrimary,
    });
  }

  public static async remove(productId: string, imageId: string, ownerId: string): Promise<boolean> {
    const supabase = getMediaSupabaseClient();
    const { data: current } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", imageId)
      .eq("product_id", productId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    const target = current as ProductImageRow | null;
    if (!target) return false;

    await supabase.from(TABLE).delete().eq("id", imageId);

    if (target.is_primary) {
      const remaining = await this.list(productId);
      await (supabase.from("products") as any)
        .update({
          primary_image_url: remaining[0]
            ? `/api/products/${productId}/primary-image`
            : null,
        })
        .eq("id", productId);
      if (remaining[0]) {
        await (supabase.from(TABLE) as any).update({ is_primary: true }).eq("id", remaining[0].id);
      }
    }

    if (target.storage_provider === SUPABASE_STORAGE_PROVIDER && target.storage_path) {
      void import("@/lib/media/product-media-storage.server").then((storage) =>
        storage.removeProductImageObject(target.storage_path)
      );
    } else if (target.external_id) {
      void deleteImageKitFile(target.external_id).catch(() => undefined);
    }
    return true;
  }

  public static async setPrimary(productId: string, imageId: string, ownerId: string): Promise<boolean> {
    const supabase = getMediaSupabaseClient();
    const { data: current } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", imageId)
      .eq("product_id", productId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (!current) return false;
    const row = current as ProductImageRow;

    await (supabase.from(TABLE) as any).update({ is_primary: false }).eq("product_id", productId);
    await (supabase.from(TABLE) as any).update({ is_primary: true }).eq("id", imageId);
    await (supabase.from("products") as any)
      .update({ primary_image_url: `/api/products/${productId}/primary-image` })
      .eq("id", productId);
    return true;
  }

  public static async reorder(productId: string, orderedIds: string[], ownerId: string): Promise<boolean> {
    const supabase = getMediaSupabaseClient();
    const existing = await this.list(productId);
    if (existing.some((i) => i.owner_id !== ownerId)) return false;

    await Promise.all(
      orderedIds.map((id, index) =>
        (supabase.from(TABLE) as any).update({ sort_order: index }).eq("id", id).eq("product_id", productId)
      )
    );
    return true;
  }
}
