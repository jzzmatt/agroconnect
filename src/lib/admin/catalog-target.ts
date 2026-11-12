export const CATALOG_KINDS = ["product", "course", "service", "transport"] as const;

export type CatalogKind = (typeof CATALOG_KINDS)[number];

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCatalogKind(value: string | undefined): CatalogKind {
  if (value === "course" || value === "service" || value === "transport") return value;
  return "product";
}

export function parseCatalogId(value: string): string | null {
  const id = value.trim();
  if (!UUID.test(id)) return null;
  return id.toLowerCase();
}

export function sanitizeCatalogSearch(raw: string): string {
  return raw.replace(/[^0-9A-Za-zÀ-ÿ\s-]/g, "").trim().slice(0, 80);
}

export function catalogTable(kind: CatalogKind): "products" | "courses" | "services" | "transport_services" {
  if (kind === "course") return "courses";
  if (kind === "service") return "services";
  if (kind === "transport") return "transport_services";
  return "products";
}

export function isClosedAccount(status: string | null | undefined, isActive: boolean | null | undefined): boolean {
  return isActive === false || status === "inactive" || status === "suspended";
}
