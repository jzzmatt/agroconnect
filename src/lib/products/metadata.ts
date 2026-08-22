import { z } from "zod";
import {
  ANIMAL_SEXES,
  ANIMAL_SPECIES,
  ANIMAL_UNITS,
  LAND_AREA_UNITS,
  LAND_PROPERTY_TYPES,
  LEASE_PERIODS,
  LISTING_TYPES,
  PRODUCT_CATEGORY_SLUGS,
  PRODUCT_TYPES,
  areaToSquareMeters,
  type AnimalSpecies,
  type LandAreaUnit,
  type ListingType,
  type ProductCategorySlug,
  type ProductType,
} from "@/config/product-catalog";

export const animalMetadataSchema = z.object({
  listing_type: z.enum(LISTING_TYPES).default("sale"),
  species: z.enum(ANIMAL_SPECIES),
  breed: z.string().trim().max(120).optional().or(z.literal("")),
  sex: z.enum(ANIMAL_SEXES).default("unspecified"),
  age: z.string().trim().max(80).optional().or(z.literal("")),
  weight: z.string().trim().max(80).optional().or(z.literal("")),
  quantity: z.number().int().positive(),
  unit: z.enum(ANIMAL_UNITS).default("unit"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const landMetadataSchema = z.object({
  listing_type: z.enum(LISTING_TYPES),
  property_type: z.enum(LAND_PROPERTY_TYPES).default("farm"),
  area_value: z.number().positive(),
  area_unit: z.enum(LAND_AREA_UNITS),
  area_sqm: z.number().positive().optional(),
  lease_period: z.enum(LEASE_PERIODS).optional(),
});

export const productLocationSchema = z.object({
  province_name: z.string().trim().min(2).max(80),
  municipality_name: z.string().trim().max(80).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const productMetadataSchema = z.object({
  product_type: z.enum(PRODUCT_TYPES),
  category_slug: z.enum(PRODUCT_CATEGORY_SLUGS),
  original_condition: z.string().optional(),
  animal: animalMetadataSchema.optional(),
  land: landMetadataSchema.optional(),
  location: productLocationSchema.optional(),
});

export type ProductMetadata = z.infer<typeof productMetadataSchema>;
export type AnimalMetadata = z.infer<typeof animalMetadataSchema>;
export type LandMetadata = z.infer<typeof landMetadataSchema>;

export function buildProductMetadata(input: {
  categorySlug: ProductCategorySlug;
  productType: ProductType;
  condition?: string;
  animal?: Partial<AnimalMetadata> | null;
  land?: Partial<LandMetadata> | null;
  location?: { province_name: string; municipality_name?: string; latitude?: number; longitude?: number };
}): ProductMetadata {
  const metadata: ProductMetadata = {
    product_type: input.productType,
    category_slug: input.categorySlug,
    original_condition: input.condition,
    location: input.location
      ? {
          province_name: input.location.province_name,
          municipality_name: input.location.municipality_name || "",
          latitude: input.location.latitude,
          longitude: input.location.longitude,
        }
      : undefined,
  };

  if (input.productType === "animal" && input.animal) {
    metadata.animal = animalMetadataSchema.parse({
      listing_type: "sale",
      species: (input.animal.species || "other") as AnimalSpecies,
      breed: input.animal.breed || "",
      sex: input.animal.sex || "unspecified",
      age: input.animal.age || "",
      weight: input.animal.weight || "",
      quantity: Number(input.animal.quantity || 1),
      unit: input.animal.unit || "unit",
      notes: input.animal.notes || "",
    });
  }

  if (input.productType === "land" && input.land) {
    const areaValue = Number(input.land.area_value);
    const areaUnit = (input.land.area_unit || "hectare") as LandAreaUnit;
    const listingType = (input.land.listing_type || "sale") as ListingType;
    metadata.land = landMetadataSchema.parse({
      listing_type: listingType,
      property_type: input.land.property_type || "farm",
      area_value: areaValue,
      area_unit: areaUnit,
      area_sqm: areaToSquareMeters(areaValue, areaUnit),
      lease_period: listingType === "lease" ? input.land.lease_period || "year" : undefined,
    });
  }

  return productMetadataSchema.parse(metadata);
}
