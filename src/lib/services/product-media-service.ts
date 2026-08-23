import type { ProductImageDescriptor } from "@/types/media";
export type { ProductImageDescriptor };

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const imagesByProduct = new Map<string, ProductImageDescriptor[]>();

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

export class ProductMediaService {
  public static list(productId: string): ProductImageDescriptor[] {
    return [...(imagesByProduct.get(productId) || [])].sort((a, b) => a.sort_order - b.sort_order);
  }

  public static primaryUrl(productId: string): string | null {
    const images = this.list(productId);
    return images.find((i) => i.is_primary)?.url || images[0]?.url || null;
  }

  public static add(params: {
    productId: string;
    ownerId: string;
    url: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    fileSize: number;
    altText: string;
    isPrimary?: boolean;
  }): ProductImageDescriptor {
    const existing = this.list(params.productId);
    const image: ProductImageDescriptor = {
      id: `pimg-${Math.random().toString(36).slice(2, 10)}`,
      product_id: params.productId,
      owner_id: params.ownerId,
      url: params.url,
      alt_text: params.altText,
      mime_type: params.mimeType,
      file_size: params.fileSize,
      sort_order: existing.length,
      is_primary: params.isPrimary || existing.length === 0,
      created_at: new Date().toISOString(),
    };
    const next = params.isPrimary
      ? existing.map((i) => ({ ...i, is_primary: false })).concat(image)
      : existing.concat(image);
    imagesByProduct.set(params.productId, next);
    return image;
  }

  public static remove(productId: string, imageId: string, ownerId: string): boolean {
    const existing = this.list(productId);
    const target = existing.find((i) => i.id === imageId);
    if (!target || target.owner_id !== ownerId) return false;
    const next = existing.filter((i) => i.id !== imageId);
    if (target.is_primary && next[0]) next[0].is_primary = true;
    imagesByProduct.set(productId, next);
    return true;
  }

  public static setPrimary(productId: string, imageId: string, ownerId: string): boolean {
    const existing = this.list(productId);
    if (!existing.some((i) => i.id === imageId && i.owner_id === ownerId)) return false;
    imagesByProduct.set(
      productId,
      existing.map((i) => ({ ...i, is_primary: i.id === imageId }))
    );
    return true;
  }

  public static reorder(productId: string, orderedIds: string[], ownerId: string): boolean {
    const existing = this.list(productId);
    if (existing.some((i) => i.owner_id !== ownerId)) return false;
    const byId = new Map(existing.map((i) => [i.id, i]));
    const next = orderedIds
      .map((id, index) => {
        const img = byId.get(id);
        return img ? { ...img, sort_order: index } : null;
      })
      .filter(Boolean) as ProductImageDescriptor[];
    imagesByProduct.set(productId, next);
    return true;
  }
}
