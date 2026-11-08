export interface ProductWhatsappMessageInput {
  name: string;
  description?: string | null;
  priceKz: number;
  province?: string | null;
  municipality?: string | null;
  locality?: string | null;
  transportIncluded: boolean;
  videoUrl?: string | null;
  orderUrl: string;
  listingUrl?: string | null;
}

function line(value: string | null | undefined): string | null {
  const text = value?.replace(/\s+/g, " ").trim();
  return text ? text : null;
}

export function formatKwanza(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 2 }).format(value)} Kz`;
}

export function formatProductLocation(input: {
  province?: string | null;
  municipality?: string | null;
  locality?: string | null;
}): string | null {
  const parts = [line(input.province), line(input.municipality), line(input.locality)].filter(
    (part): part is string => Boolean(part)
  );
  return parts.length ? parts.join(" / ") : null;
}

/** Portuguese (Angola) product post. Empty fields are left out. */
export function buildProductWhatsappMessage(input: ProductWhatsappMessageInput): string {
  const name = line(input.name) || "Produto";
  const description = line(input.description);
  const location = formatProductLocation(input);
  const video = line(input.videoUrl);
  const orderUrl = line(input.orderUrl) || "";
  const listingUrl = line(input.listingUrl);
  const rows = [
    "🌱 *NOVO PRODUTO DISPONÍVEL NO AGROCONNECT!*",
    "",
    `🥬 *${name}*`,
    "",
    description ? `📝 ${description}` : null,
    description ? "" : null,
    `💰 *Preço:* ${formatKwanza(input.priceKz)}`,
    location ? `📍 *Localização:* ${location}` : null,
    `🚚 *Transporte:* ${input.transportIncluded ? "Incluído" : "Não incluído"}`,
    "",
    "📸 Consulte as fotografias do produto.",
    video ? `🎥 *Vídeo:* ${video}` : null,
    "",
    "🛒 *FAÇA JÁ A SUA ENCOMENDA!*",
    "",
    "👇 Encomende aqui:",
    "",
    orderUrl,
    listingUrl && listingUrl !== orderUrl ? listingUrl : null,
    "",
    "🌍 Descubra mais produtos no Agroconnect!",
    "",
    "#Agroconnect #AgriculturaAngolana #AgroProduct",
  ];
  return rows.filter((row) => row !== null).join("\n");
}

export function productVideoThumbnailMediaUrl(origin: string, productId: string): string {
  return `${origin.replace(/\/$/, "")}/api/products/${productId}/video-thumbnail`;
}

export function videoThumbnailCaption(videoUrl?: string | null): string {
  const video = line(videoUrl);
  return (video ? `🎥 Vídeo do produto: ${video}` : "🎥 Vídeo do produto").slice(0, 1000);
}

export function orderUrlForProduct(origin: string, productId: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/order/${productId}?source=whatsapp`;
}

export function isHttpsMediaUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}
