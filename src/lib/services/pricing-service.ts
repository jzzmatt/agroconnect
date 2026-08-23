import type { SubscriptionPlan, UserRoleType } from "@/types/database";
import type { SubscriptionPlanDefinition, UserEntitlements } from "@/types/domain";

export const GB = 1024 * 1024 * 1024;

export const VIDEO_STORAGE_QUOTA_BYTES = {
  basic: 0,
  professional: 100 * GB,
  business: 300 * GB,
  enterprise: 1 * 1024 * GB, // 1 TB
} as const;

/**
 * The 4 Canonical AgriConnect Subscription Plans
 * BÁSICO (0 Kz/mês)
 * PROFISSIONAL (15.000 Kz/mês — 10 produtos, AgriAcademy 100 GB)
 * BUSINESS (30.000 Kz/mês — ilimitado, AgriAcademy 300 GB)
 * EMPRESARIAL (80.000 Kz/mês — ilimitado, AgriAcademy 1 TB)
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
    videoStorageLimitGb: 0,
    features: [
      "Gestão de perfil pessoal",
      "Acesso básico à plataforma",
      "Explorar produtos no AgriShopping",
      "Explorar cursos disponíveis no AgriAcademy",
      "Pesquisar especialistas no AgriExpert",
    ],
    lockedFeatures: [
      "Criar e publicar produtos no AgriShopping",
      "Imagens de produto",
      "Criar e publicar cursos no AgriAcademy",
      "Armazenamento de vídeo AgriAcademy",
      "Alterar país de atuação",
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
    videoStorageLimitGb: 100,
    features: [
      "Tudo incluído no plano Básico",
      "AgriShopping: criar e publicar até 10 produtos ativos",
      "Imagens de produto (principal e galeria)",
      "AgriAcademy: criar cursos e formação em vídeo",
      "100 GB de armazenamento de vídeo AgriAcademy",
      "Seleção de país de atuação",
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
    productLimit: null,
    videoStorageLimitGb: 300,
    features: [
      "Tudo incluído no plano Profissional",
      "Produtos sem limite definido",
      "Funcionalidades avançadas de vendedor",
      "AgriAcademy desbloqueado",
      "300 GB de armazenamento de vídeo AgriAcademy",
      "Seleção de país de atuação",
    ],
    ctaText: "Escolher Plano Business",
  },
  enterprise: {
    id: "enterprise",
    slug: "enterprise",
    name: "Empresarial",
    priceMonthlyAoa: 80000,
    priceFormatted: "80.000 Kz",
    period: "mês",
    tagline: "Para grandes empresas, cooperativas e organizações agropecuárias",
    productLimit: null,
    videoStorageLimitGb: 1024,
    features: [
      "Tudo incluído no plano Business",
      "Catálogo ilimitado e capacidades empresariais",
      "AgriAcademy desbloqueado",
      "1 TB de armazenamento de vídeo AgriAcademy",
      "Serviço: Configuração personalizada de gateway de pagamento",
      "Seleção de país de atuação",
    ],
    ctaText: "Subscrever Empresarial",
  },
};

export function normalizePlanSlug(plan?: string | null): "basic" | "professional" | "business" | "enterprise" {
  if (!plan) return "basic";
  const normalized = plan
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "free" || normalized === "basic" || normalized === "basico") return "basic";
  if (normalized === "professional" || normalized === "profissional" || normalized === "pro") return "professional";
  if (normalized === "business") return "business";
  if (normalized === "enterprise" || normalized === "empresarial" || normalized === "premium") return "enterprise";
  return "basic";
}

export type SubscriptionLifecycleStatus = "active" | "pending" | "cancelled" | "expired";

export function normalizeSubscriptionStatus(
  status?: string | null
): SubscriptionLifecycleStatus {
  if (status === "pending" || status === "cancelled" || status === "expired") return status;
  return "active";
}

/**
 * Paid capabilities are granted only when the stored plan is paid AND the
 * subscription lifecycle is active. Missing status defaults to active so
 * existing rows without a status column keep working.
 */
export function isPaidSubscriptionActive(
  plan?: string | null,
  status?: string | null
): boolean {
  const planSlug = normalizePlanSlug(plan);
  if (planSlug === "basic") return false;
  return normalizeSubscriptionStatus(status) === "active";
}

export function canAccessAgriProduct(plan?: string | null, status?: string | null): boolean {
  return isPaidSubscriptionActive(plan, status);
}

export function canCreateProducts(plan?: string | null, status?: string | null): boolean {
  return isPaidSubscriptionActive(plan, status);
}

export function canPublishProducts(plan?: string | null, status?: string | null): boolean {
  return isPaidSubscriptionActive(plan, status);
}

export function canUploadProductVideo(plan?: string | null, status?: string | null): boolean {
  return isPaidSubscriptionActive(plan, status);
}

export const ACTIVE_PRODUCT_STATUSES = ["published", "active", "draft"] as const;

export function isCountableActiveProduct(status?: string | null): boolean {
  if (!status) return false;
  if (status === "archived" || status === "deleted") return false;
  return (ACTIVE_PRODUCT_STATUSES as readonly string[]).includes(status);
}

export function countActiveProducts<T extends { status?: string | null }>(products: T[]): number {
  return products.filter((product) => isCountableActiveProduct(product.status)).length;
}

export function isProductLimitReached(plan?: string | null, activeCount = 0): boolean {
  const limit = SUBSCRIPTION_PLANS[normalizePlanSlug(plan)].productLimit;
  return limit !== null && activeCount >= limit;
}

/**
 * Computes user entitlements strictly based on subscription plan.
 * FAILS CLOSED: missing or invalid plan defaults safely to Basic.
 *
 * can_create_products is a plan capability (Professional+). The 10-product
 * Professional cap is exposed separately as product_limit / product_limit_reached
 * and must be enforced in the product API — never conflated with "Basic locked".
 */
export function getUserEntitlements(params: {
  subscriptionPlan?: SubscriptionPlan | string | null;
  subscriptionStatus?: string | null;
  roles?: UserRoleType[];
  accountType?: string;
  activeProductCount?: number;
}): UserEntitlements {
  const planSlug = normalizePlanSlug(params.subscriptionPlan);
  const planDef = SUBSCRIPTION_PLANS[planSlug];
  const subscriptionStatus = normalizeSubscriptionStatus(params.subscriptionStatus);

  const isBasic = planSlug === "basic";
  const isProfessional = planSlug === "professional";
  const isBusiness = planSlug === "business";
  const isEnterprise = planSlug === "enterprise";
  const isPaid = isPaidSubscriptionActive(planSlug, subscriptionStatus);

  const productLimit = planDef.productLimit;
  const activeCount = params.activeProductCount ?? 0;
  const productLimitReached = isPaid && productLimit !== null && activeCount >= productLimit;

  return {
    plan: planSlug,
    subscription_status: subscriptionStatus,
    can_access_agrishopping: isPaid,
    can_access_agriproduct: isPaid,
    can_access_agriacademy: isPaid,
    can_access_agrilocalizacao: isPaid,
    can_access_agrilocalization: isPaid,
    can_access_agriexpert: isPaid,
    can_access_business_dashboard: isPaid && (isBusiness || isEnterprise),

    can_sell_products: isPaid,
    can_create_products: isPaid,
    can_edit_products: isPaid,
    can_publish_products: isPaid,
    can_manage_inventory: isPaid,
    can_upload_product_images: isPaid,
    can_upload_product_video: isPaid,
    product_limit_reached: productLimitReached,
    can_manage_services: isPaid,
    can_teach_courses: isPaid,
    can_create_courses: isPaid,
    can_publish_courses: isPaid,
    can_manage_locations: isPaid,
    can_change_market_country: isPaid,
    can_request_custom_payment_gateway: isPaid && isEnterprise,

    product_limit: isBasic ? 0 : productLimit,
    max_products: isBasic ? 0 : productLimit,
    max_services: isBasic || !isPaid ? 0 : isProfessional ? 20 : null,
    video_storage_limit_bytes: isPaid ? VIDEO_STORAGE_QUOTA_BYTES[planSlug] : 0,
    video_storage_limit_gb: isPaid ? planDef.videoStorageLimitGb : 0,
  };
}

export function formatVideoStorage(bytes: number): string {
  if (bytes <= 0) return "0 GB";
  const gb = bytes / GB;
  if (gb >= 1024) {
    return `${(gb / 1024).toLocaleString("pt-AO", { maximumFractionDigits: 1 })} TB`;
  }
  return `${gb.toLocaleString("pt-AO", { maximumFractionDigits: 1 })} GB`;
}

export function getStorageWarningLevel(usedBytes: number, limitBytes: number): "ok" | "warn" | "critical" | "full" {
  if (limitBytes <= 0) return "full";
  const ratio = usedBytes / limitBytes;
  if (ratio >= 1) return "full";
  if (ratio >= 0.9) return "critical";
  if (ratio >= 0.8) return "warn";
  return "ok";
}

export function normalizeWhatsAppNumber(rawPhone: string): {
  normalized: string;
  formatted: string;
  isValid: boolean;
  waLink: string;
} {
  if (!rawPhone) {
    return { normalized: "", formatted: "", isValid: false, waLink: "" };
  }

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
