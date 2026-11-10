import { durableWhatsappLink, formatKwanza, formatProductLocation } from "@/lib/whatsapp/product-message";
import { serviceBookingPath, servicePagePath } from "@/lib/whatsapp/service-booking";

function clip(value: string | null | undefined, max = 280): string | null {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}

export function formatServicePrice(price: number, currency: string, pricingType: string): string {
  if (pricingType === "quotation") return "Preço sob consulta";
  if (pricingType === "free" || price <= 0) return "Gratuito";
  const amount = currency === "AOA" || currency === "Kz" ? formatKwanza(price) : `${price} ${currency}`;
  if (pricingType === "hourly") return `${amount} / hora`;
  if (pricingType === "daily") return `${amount} / dia`;
  if (pricingType === "starting_from") return `A partir de ${amount}`;
  return amount;
}

export function serviceBookingUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/$/, "")}${serviceBookingPath(slug)}`;
}

export function servicePageUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/$/, "")}${servicePagePath(slug)}`;
}

/** Portuguese invitation. The appointment is not confirmed by this message. */
export function buildServiceWhatsappMessage(input: {
  title: string;
  providerName?: string | null;
  price: number;
  currency?: string | null;
  pricingType?: string | null;
  description?: string | null;
  province?: string | null;
  municipality?: string | null;
  bookingUrl: string;
  serviceUrl: string;
}): string {
  const title = clip(input.title, 120) || "Serviço";
  const provider = clip(input.providerName, 80);
  const description = clip(input.description);
  const location = formatProductLocation({
    province: input.province,
    municipality: input.municipality,
  });
  const booking = durableWhatsappLink(input.bookingUrl) || "";
  const page = durableWhatsappLink(input.serviceUrl) || "";
  const rows = [
    "🤝 *SERVIÇO DISPONÍVEL NO AGROCONNECT!*",
    "",
    `🛠️ *${title}*`,
    "",
    description,
    description ? "" : null,
    provider ? `👨‍🌾 *Prestador:* ${provider}` : null,
    `💰 *Preço:* ${formatServicePrice(input.price, input.currency || "AOA", input.pricingType || "fixed")}`,
    location ? `📍 *Localização:* ${location}` : null,
    "",
    "📅 *Marque uma consulta*",
    "Registe-se ou inicie sessão e escolha a data deste serviço. O pedido só fica registado depois de o enviar.",
    booking,
    "",
    "🔗 Ver o serviço",
    page,
    "",
    "#Agroconnect #AgriExpert",
  ];
  return rows.filter((row) => row !== null).join("\n");
}
