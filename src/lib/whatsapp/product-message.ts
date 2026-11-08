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
  const video = durableWhatsappLink(input.videoUrl);
  const orderUrl = durableWhatsappLink(input.orderUrl) || "";
  const listingUrl = durableWhatsappLink(input.listingUrl);
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
    video ? "🎥 Ver o vídeo do produto" : null,
    video,
    "",
    "🛒 *FAÇA JÁ A SUA ENCOMENDA!*",
    "👇 Encomende aqui",
    orderUrl,
    listingUrl && listingUrl !== orderUrl && listingUrl !== video ? `🛍️ Ver o produto\n${listingUrl}` : null,
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

/**
 * WaAPI v1 group sends are text, media, vCard, location, poll, event, and
 * community announcement. The reference has no interactive URL-button action,
 * and an ordinary group message cannot hide a URL behind an emoji or Markdown.
 * Product groups therefore use readable https links on existing app routes.
 */
export function waapiGroupUrlButtonsSupported(): false {
  return false;
}

export function productActionLinks(input: {
  origin: string;
  productId: string;
  slug: string | null;
  hasVideo: boolean;
}): { videoUrl: string | null; orderUrl: string } {
  const origin = input.origin.replace(/\/$/, "");
  const slug = input.slug?.trim();
  if (slug) {
    const productPath = `${origin}/agrishopping/products/${encodeURIComponent(slug)}`;
    return {
      videoUrl: input.hasVideo ? `${productPath}/video` : null,
      orderUrl: `${productPath}/encomendar`,
    };
  }
  return {
    videoUrl: input.hasVideo ? `${origin}/api/products/${input.productId}/video-playback` : null,
    orderUrl: orderUrlForProduct(origin, input.productId),
  };
}

/** Signed storage URLs expire and must not be printed as the product video link. */
export function durableWhatsappLink(url: string | null | undefined): string | null {
  const text = url?.trim();
  if (!text || !text.startsWith("https://")) return null;
  if (/\/object\/sign\/|[?&]token=|supabase/i.test(text)) return null;
  return text;
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
