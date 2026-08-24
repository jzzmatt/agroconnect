import type { ProductImageDescriptor } from "@/types/media";
import { getMediaSupabaseClient } from "@/lib/media/db";
import { deleteImageKitFile, productMediaFolder, uploadBufferToImageKit } from "@/lib/media/imagekit";
import type { Database } from "@/types/database";

export type { ProductImageDescriptor };

const TABLE = "product_images";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];

function toDescriptor(row: ProductImageRow): ProductImageDescriptor {
  return {
    id: row.id,
    product_id: row.product_id,
    owner_id: row.owner_id,
    url: row.url,
    alt_text: row.alt_text || "",
    mime_type: row.mime_type,
    file_size: row.file_size,
    sort_order: row.sort_order,
    is_primary: row.is_primary,
    created_at: row.created_at,
  };
}

export function validateProductImage(params: {
  mimeType: string;
  fileSize: number;
  fileName?: string;
}): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_TYPES.has(params.mimeType)) {
    return { ok: false, error: "Formato inválido. Utilize JPEG, PNG ou WebP." };
  }
  if (params.fileSize <= 0 || params.fileSize > MAX_IMAGE_BYTES) {
    return { ok: false, error: "A imagem deve ter no máximo 5 MB." };
  }
  const ext = (params.fileName || "").toLowerCase();
  if (ext && !/\.(jpe?g|png|webp)$/.test(ext)) {
    return { ok: false, error: "Extensão de ficheiro inválida." };
  }
  return { ok: true };
}

export function buildProductImageAlt(productName: string): string {
  const name = productName.trim() || "Produto agrícola";
  return `${name} — AgriConnect`;
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
    return ((data || []) as ProductImageRow[]).map(toDescriptor);
  }

  public static async primaryUrl(productId: string): Promise<string | null> {
    const images = await this.list(productId);
    return images.find((i) => i.is_primary)?.url || images[0]?.url || null;
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
    const uploaded = await uploadBufferToImageKit({
      buffer: params.buffer,
      fileName: params.fileName,
      folder: productMediaFolder(params.productId, "images"),
    });
    if (!uploaded.configured || !uploaded.url) {
      throw Object.assign(new Error(uploaded.error || "Não foi possível carregar a imagem."), {
        code: uploaded.code || "IMAGEKIT_UPLOAD_FAILED",
      });
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
        storage_provider: "imagekit",
        storage_path: uploaded.filePath || params.fileName,
        external_id: uploaded.fileId,
        url: uploaded.url,
        alt_text: params.altText,
        mime_type: params.mimeType,
        file_size: uploaded.fileSize ?? params.fileSize,
        sort_order: existing.length,
        is_primary: isPrimary,
      })
      .select()
      .single();
    if (error || !data) {
      void deleteImageKitFile(uploaded.fileId || "").catch(() => undefined);
      throw Object.assign(new Error(error?.message || "Não foi possível guardar a imagem."), {
        code: "PRODUCT_IMAGE_INSERT_FAILED",
      });
    }

    if (isPrimary) {
      await (supabase.from("products") as any).update({ primary_image_url: uploaded.url }).eq("id", params.productId);
    }

    return toDescriptor(data as ProductImageRow);
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
        .update({ primary_image_url: remaining[0]?.url || null })
        .eq("id", productId);
      if (remaining[0]) {
        await (supabase.from(TABLE) as any).update({ is_primary: true }).eq("id", remaining[0].id);
      }
    }

    if (target.external_id) {
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
    await (supabase.from("products") as any).update({ primary_image_url: row.url }).eq("id", productId);
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
