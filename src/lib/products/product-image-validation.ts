const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
