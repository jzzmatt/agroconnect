import type { SubscriptionPlan, UserRoleType } from "@/types/database";
import type { SubscriptionPlanDefinition, UserEntitlements } from "@/types/domain";

/**
 * The 4 Canonical AgriConnect Subscription Plans
 * BÁSICO (0 Kz/mês)
 * PROFISSIONAL (15.000 Kz/mês - Max 10 produtos)
 * BUSINESS (30.000 Kz/mês - Ilimitado, Mais escolhido para vendedores)
 * EMPRESARIAL (60.000 Kz/mês - Ilimitado)
 */
export const SUBSCRIPTION_PLANS: Record<"basic" | "professional" | "business" | "enterprise", SubscriptionPlanDefinition> = {
  basic: {
    id: "basic",
    slug: "basic",
    name: "Básico",
    priceMonthlyAoa: 0,
    priceFormatted: "0 Kz",
    period: "mês",
    tagline: "Para explorar o ecossistema agrícola de Angola",
    productLimit: 0,
    features: [
      "Explorar produtos no AgriShopping",
      "Explorar cursos disponíveis no AgriAcademy",
      "Pesquisar especialistas no AgriExpert",
      "Mapa interativo de localização nas 18 províncias",
      "Perfil pessoal e favoritos",
    ],
    lockedFeatures: [
      "Criar e publicar produtos no AgriShopping",
      "Criar e publicar cursos no AgriAcademy",
      "Gestão de stock e vendas",
    ],
    ctaText: "Começar Gratuitamente",
  },
  professional: {
    id: "professional",
    slug: "professional",
    name: "Profissional",
    priceMonthlyAoa: 15000,
    priceFormatted: "15.000 Kz",
    period: "mês",
    tagline: "Para profissionais, técnicos e criadores de formação",
    productLimit: 10,
    features: [
      "Tudo incluído no plano Básico",
      "Criar e publicar até 10 produtos ativos no AgriShopping",
      "Criar e publicar cursos práticos no AgriAcademy",
      "Gestão profissional de serviços e consultorias",
      "Destaque verificado no AgriLocalização",
      "Acesso a métricas de desempenho e pedidos",
    ],
    ctaText: "Subscrever Profissional",
  },
  business: {
    id: "business",
    slug: "business",
    name: "Business",
    priceMonthlyAoa: 30000,
    priceFormatted: "30.000 Kz",
    period: "mês",
    tagline: "Para vendedores, distribuidores e empresas agrícolas em crescimento",
    highlightBadge: "MAIS ESCOLHIDO PARA VENDEDORES",
    isPopular: true,
    productLimit: null, // Unlimited
    features: [
      "Tudo incluído no plano Profissional",
      "Produtos sem limite definido (Sem teto de 10 produtos)",
      "Gestão avançada de stock e encomendas no AgriShopping",
      "Perfil empresarial verificado com catálogo completo",
      "Gestão de múltiplos pontos de recolha e rotas de entrega",
      "Suporte comercial prioritário",
    ],
    ctaText: "Escolher Plano Business",
  },
  enterprise: {
    id: "enterprise",
    slug: "enterprise",
    name: "Empresarial",
    priceMonthlyAoa: 60000,
    priceFormatted: "60.000 Kz",
    period: "mês",
    tagline: "Para grandes empresas, cooperativas e organizações agropecuárias",
    productLimit: null, // Unlimited
    features: [
      "Tudo incluído no plano Business",
      "Catálogo ilimitado e gestão multi-utilizador",
      "Funcionalidades empresariais avançadas",
      "Relatórios de procura e inteligência de mercado",
      "Gestor de conta dedicado em Angola",
    ],
    ctaText: "Subscrever Empresarial",
  },
};

/**
 * Normalizes plan slugs gracefully (e.g. 'free' -> 'basic', 'premium' -> 'enterprise')
 */
export function normalizePlanSlug(plan?: string | null): "basic" | "professional" | "business" | "enterprise" {
  if (!plan) return "basic";
  const normalized = plan.toLowerCase().trim();
  if (normalized === "free" || normalized === "basic" || normalized === "basico") return "basic";
  if (normalized === "professional" || normalized === "profissional" || normalized === "pro") return "professional";
  if (normalized === "business") return "business";
  if (normalized === "enterprise" || normalized === "empresarial" || normalized === "premium") return "enterprise";
  return "basic";
}

/**
 * Computes user entitlements strictly based on subscription plan
 */
export function getUserEntitlements(params: {
  subscriptionPlan?: SubscriptionPlan | string | null;
  roles?: UserRoleType[];
  accountType?: string;
}): UserEntitlements {
  const planSlug = normalizePlanSlug(params.subscriptionPlan);
  const planDef = SUBSCRIPTION_PLANS[planSlug];

  const isBasic = planSlug === "basic";
  const isProfessional = planSlug === "professional";
  const isBusinessOrAbove = planSlug === "business" || planSlug === "enterprise";

  return {
    can_sell_products: !isBasic,
    can_create_products: !isBasic,
    can_edit_products: !isBasic,
    can_publish_products: !isBasic,
    can_manage_inventory: !isBasic,
    can_manage_services: !isBasic,
    can_teach_courses: !isBasic,
    can_create_courses: !isBasic,
    can_publish_courses: !isBasic,
    can_access_business_dashboard: isBusinessOrAbove,
    product_limit: planDef.productLimit,
    max_products: planDef.productLimit,
    max_services: isBasic ? 0 : isProfessional ? 20 : null,
  };
}

/**
 * Formats WhatsApp Angola numbers into E.164 (+2449XXXXXXXX) and formatted display (+244 9XX XXX XXX)
 */
export function normalizeWhatsAppNumber(rawPhone: string): {
  normalized: string;
  formatted: string;
  isValid: boolean;
  waLink: string;
} {
  if (!rawPhone) {
    return { normalized: "", formatted: "", isValid: false, waLink: "" };
  }

  // Remove spaces, dashes, parentheses
  const digits = rawPhone.replace(/\D/g, "");

  let e164 = "";
  if (digits.startsWith("244")) {
    e164 = `+${digits}`;
  } else if (digits.length === 9 && (digits.startsWith("9") || digits.startsWith("2"))) {
    e164 = `+244${digits}`;
  } else {
    e164 = `+${digits}`;
  }

  const isValid = e164.length === 13 && e164.startsWith("+244");

  // Format as +244 9XX XXX XXX
  let formatted = e164;
  if (isValid) {
    const d = e164.substring(4);
    formatted = `+244 ${d.substring(0, 3)} ${d.substring(3, 6)} ${d.substring(6, 9)}`;
  }

  const waLink = isValid ? `https://wa.me/${e164.replace("+", "")}` : "";

  return {
    normalized: e164,
    formatted,
    isValid,
    waLink,
  };
}
