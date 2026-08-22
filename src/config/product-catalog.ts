export const PRODUCT_TYPES = ["standard", "animal", "land"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_CATEGORY_SLUGS = [
  "sementes-e-fertilizantes",
  "maquinas-e-irrigacao",
  "produtos-agricolas",
  "alimentacao-animal",
  "animals",
  "land",
] as const;
export type ProductCategorySlug = (typeof PRODUCT_CATEGORY_SLUGS)[number];

export const ANIMAL_SPECIES = ["pigs", "chickens", "cattle", "goats", "sheep", "other"] as const;
export type AnimalSpecies = (typeof ANIMAL_SPECIES)[number];

export const ANIMAL_SEXES = ["male", "female", "mixed", "unspecified"] as const;
export type AnimalSex = (typeof ANIMAL_SEXES)[number];

export const ANIMAL_UNITS = ["unit", "head"] as const;
export type AnimalUnit = (typeof ANIMAL_UNITS)[number];

export const LISTING_TYPES = ["sale", "lease"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const LAND_PROPERTY_TYPES = ["raw_land", "farm", "agricultural_property"] as const;
export type LandPropertyType = (typeof LAND_PROPERTY_TYPES)[number];

export const LAND_AREA_UNITS = ["sqm", "hectare"] as const;
export type LandAreaUnit = (typeof LAND_AREA_UNITS)[number];

export const LEASE_PERIODS = ["month", "year"] as const;
export type LeasePeriod = (typeof LEASE_PERIODS)[number];

export const SQM_PER_HECTARE = 10_000;

export const PRODUCT_VIDEO_MAX_SECONDS = 30;
export const PRODUCT_VIDEO_MAX_BYTES = 25 * 1024 * 1024; // 25 MB — enough for a 30s 720p clip
export const PRODUCT_VIDEO_ALLOWED_MIME = ["video/mp4", "video/webm"] as const;

export function isProductCategorySlug(value?: string | null): value is ProductCategorySlug {
  return !!value && (PRODUCT_CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function productTypeFromCategory(slug?: string | null): ProductType {
  if (slug === "animals") return "animal";
  if (slug === "land") return "land";
  return "standard";
}

export function areaToSquareMeters(value: number, unit: LandAreaUnit): number {
  if (unit === "hectare") return value * SQM_PER_HECTARE;
  return value;
}

export function formatAreaEquivalent(value: number, unit: LandAreaUnit) {
  const sqm = areaToSquareMeters(value, unit);
  const hectares = sqm / SQM_PER_HECTARE;
  return {
    sqm,
    hectares,
    primary: unit === "hectare" ? `${value} ha` : `${value} m²`,
    equivalent: unit === "hectare" ? `${sqm.toLocaleString("pt-AO")} m²` : `${hectares} ha`,
  };
}

export function dbCondition(condition?: string | null): "new" | "used" | "refurbished" {
  if (condition === "used" || condition === "refurbished") return condition;
  return "new";
}

export function isValidProductVideoMime(mime?: string | null): boolean {
  return !!mime && (PRODUCT_VIDEO_ALLOWED_MIME as readonly string[]).includes(mime);
}
