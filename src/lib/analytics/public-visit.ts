export type MarketplaceVisit = "agrishopping" | "agriacademy" | "agriservice";

export interface PublicVisit {
  route: string;
  visitorId: string;
  marketplace: MarketplaceVisit | null;
  visitedOn: string;
}

const VISITOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOT = /bot|spider|crawler|slurp|curl|wget|preview|facebookexternalhit|whatsapp|headless/i;

const PUBLIC_PREFIXES = [
  "/about",
  "/planos",
  "/pricing",
  "/agrishopping",
  "/agriacademy",
  "/agriservice",
  "/agriexpert",
  "/services",
  "/providers",
  "/sellers",
  "/transport",
  "/agrilocalizacao",
];

function marketplaceFor(pathname: string): MarketplaceVisit | null {
  if (pathname === "/agrishopping" || pathname.startsWith("/agrishopping/")) return "agrishopping";
  if (pathname === "/agriacademy" || pathname.startsWith("/agriacademy/")) return "agriacademy";
  if (
    pathname === "/agriservice" ||
    pathname.startsWith("/agriservice/") ||
    pathname === "/agriexpert" ||
    pathname.startsWith("/agriexpert/") ||
    pathname === "/services" ||
    pathname.startsWith("/services/")
  ) {
    return "agriservice";
  }
  return null;
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Accept only anonymous public page views. Protected routes, health checks,
 * bots, and files are dropped before anything is stored.
 */
export function classifyPublicVisit(input: {
  pathname?: unknown;
  visitorId?: unknown;
  userAgent?: string | null;
  now?: Date;
}): PublicVisit | null {
  if (typeof input.userAgent === "string" && BOT.test(input.userAgent)) return null;
  if (typeof input.pathname !== "string" || typeof input.visitorId !== "string") return null;
  if (!VISITOR_ID.test(input.visitorId)) return null;

  const pathOnly = input.pathname.split("?")[0]?.split("#")[0] ?? "";
  if (!pathOnly.startsWith("/") || pathOnly.includes("..") || pathOnly.includes("//") || /\s|@/.test(pathOnly)) {
    return null;
  }
  const normalized = pathOnly.length > 1 ? pathOnly.replace(/\/+$/, "") : pathOnly;
  if (normalized.length > 180 || /\.[a-z0-9]{1,8}$/i.test(normalized)) return null;
  if (!isPublicPath(normalized)) return null;

  const now = input.now ?? new Date();
  return {
    route: normalized,
    visitorId: input.visitorId.toLowerCase(),
    marketplace: marketplaceFor(normalized),
    visitedOn: now.toISOString().slice(0, 10),
  };
}
