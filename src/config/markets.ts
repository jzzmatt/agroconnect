/**
 * Country/market configuration.
 * Language is independent from market country.
 * Default market: Angola (AO). Default UI language: Português (pt).
 */

export type MarketCountryCode = "AO" | "FR" | "PT" | "US" | "GB";

export type ConfiguredPaymentMethodId =
  | "multicaixa_online"
  | "card"
  | "mock_sandbox";

export interface MarketCountry {
  code: MarketCountryCode;
  iso3: string;
  name: Record<"pt" | "en" | "fr", string>;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  phoneCode: string;
  /** Suggested default locale — NEVER auto-applied when country changes. */
  suggestedLocale: "pt" | "en" | "fr";
  mapContext: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  paymentMethods: Array<{
    id: ConfiguredPaymentMethodId;
    label: Record<"pt" | "en" | "fr", string>;
    configured: boolean;
    live: boolean;
    notes?: Record<"pt" | "en" | "fr", string>;
  }>;
}

export const DEFAULT_MARKET_COUNTRY: MarketCountryCode = "AO";

export const MARKET_COUNTRIES: Record<MarketCountryCode, MarketCountry> = {
  AO: {
    code: "AO",
    iso3: "AGO",
    name: { pt: "Angola", en: "Angola", fr: "Angola" },
    flag: "🇦🇴",
    currencyCode: "AOA",
    currencySymbol: "Kz",
    phoneCode: "+244",
    suggestedLocale: "pt",
    mapContext: { latitude: -12.5, longitude: 18.5, zoom: 5 },
    paymentMethods: [
      {
        id: "multicaixa_online",
        label: {
          pt: "Multicaixa Online",
          en: "Multicaixa Online",
          fr: "Multicaixa Online",
        },
        configured: true,
        live: false,
        notes: {
          pt: "Integração Multicaixa Online em preparação. Não simula transações reais.",
          en: "Multicaixa Online integration is being prepared. Real transactions are not simulated.",
          fr: "L'intégration Multicaixa Online est en préparation. Les transactions réelles ne sont pas simulées.",
        },
      },
    ],
  },
  FR: {
    code: "FR",
    iso3: "FRA",
    name: { pt: "França", en: "France", fr: "France" },
    flag: "🇫🇷",
    currencyCode: "EUR",
    currencySymbol: "€",
    phoneCode: "+33",
    suggestedLocale: "fr",
    mapContext: { latitude: 46.2276, longitude: 2.2137, zoom: 5 },
    paymentMethods: [
      {
        id: "card",
        label: {
          pt: "Cartão (UE) — em configuração",
          en: "Card (EU) — pending configuration",
          fr: "Carte (UE) — configuration en cours",
        },
        configured: false,
        live: false,
        notes: {
          pt: "Nenhum fornecedor de pagamento da UE está configurado neste ambiente.",
          en: "No EU payment provider is configured in this environment.",
          fr: "Aucun prestataire de paiement UE n'est configuré dans cet environnement.",
        },
      },
    ],
  },
  PT: {
    code: "PT",
    iso3: "PRT",
    name: { pt: "Portugal", en: "Portugal", fr: "Portugal" },
    flag: "🇵🇹",
    currencyCode: "EUR",
    currencySymbol: "€",
    phoneCode: "+351",
    suggestedLocale: "pt",
    mapContext: { latitude: 39.3999, longitude: -8.2245, zoom: 6 },
    paymentMethods: [
      {
        id: "card",
        label: {
          pt: "Cartão (UE) — em configuração",
          en: "Card (EU) — pending configuration",
          fr: "Carte (UE) — configuration en cours",
        },
        configured: false,
        live: false,
      },
    ],
  },
  US: {
    code: "US",
    iso3: "USA",
    name: { pt: "Estados Unidos", en: "United States", fr: "États-Unis" },
    flag: "🇺🇸",
    currencyCode: "USD",
    currencySymbol: "$",
    phoneCode: "+1",
    suggestedLocale: "en",
    mapContext: { latitude: 37.0902, longitude: -95.7129, zoom: 3 },
    paymentMethods: [
      {
        id: "card",
        label: { pt: "Cartão — em configuração", en: "Card — pending configuration", fr: "Carte — configuration en cours" },
        configured: false,
        live: false,
      },
    ],
  },
  GB: {
    code: "GB",
    iso3: "GBR",
    name: { pt: "Reino Unido", en: "United Kingdom", fr: "Royaume-Uni" },
    flag: "🇬🇧",
    currencyCode: "GBP",
    currencySymbol: "£",
    phoneCode: "+44",
    suggestedLocale: "en",
    mapContext: { latitude: 55.3781, longitude: -3.436, zoom: 5 },
    paymentMethods: [
      {
        id: "card",
        label: { pt: "Cartão — em configuração", en: "Card — pending configuration", fr: "Carte — configuration en cours" },
        configured: false,
        live: false,
      },
    ],
  },
};

export function isMarketCountryCode(value?: string | null): value is MarketCountryCode {
  return !!value && value.toUpperCase() in MARKET_COUNTRIES;
}

export function getMarketCountry(code?: string | null): MarketCountry {
  const normalized = (code || DEFAULT_MARKET_COUNTRY).toUpperCase();
  if (isMarketCountryCode(normalized)) {
    return MARKET_COUNTRIES[normalized];
  }
  return MARKET_COUNTRIES[DEFAULT_MARKET_COUNTRY];
}

export function formatMoney(amount: number, countryCode?: string | null): string {
  const market = getMarketCountry(countryCode);
  const formatted = new Intl.NumberFormat("pt-AO").format(amount);
  return `${formatted} ${market.currencySymbol}`;
}
