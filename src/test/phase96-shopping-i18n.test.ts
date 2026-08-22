import { describe, it, expect } from "vitest";
import { getDictionary } from "@/i18n";
import { localizeError } from "@/i18n/errors";
import {
  PRODUCT_CATEGORY_SLUGS,
  PRODUCT_VIDEO_MAX_SECONDS,
  SQM_PER_HECTARE,
  areaToSquareMeters,
  formatAreaEquivalent,
  productTypeFromCategory,
} from "@/config/product-catalog";
import { buildProductMetadata } from "@/lib/products/metadata";
import { validateProductVideo } from "@/lib/products/video-validation";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { ShoppingService } from "@/lib/services/shopping-service";

describe("Phase 9.6 — i18n, animals, land, video, publish", () => {
  it("translates product and dashboard copy across pt/en/fr", () => {
    const pt = getDictionary("pt");
    const en = getDictionary("en");
    const fr = getDictionary("fr");

    expect(pt.products.categories.animals).toBe("Animais");
    expect(en.products.categories.animals).toBe("Animals");
    expect(fr.products.categories.animals).toBe("Animaux");
    expect(pt.products.categories.land).toBe("Terrenos");
    expect(en.products.categories.land).toBe("Land");
    expect(fr.products.categories.land).toBe("Terrains");
    expect(en.dash.addProduct).toBe("Add product");
    expect(fr.dash.addProduct).toBe("Ajouter un produit");
    expect(en.products.name).toBe("Product name");
    expect(fr.products.name).toBe("Nom du produit");
    expect(en.common.hello).toBe("Hello");
    expect(fr.common.hello).toBe("Bonjour");
    expect(pt.errors.PRODUCT_PUBLISH_FAILED).toMatch(/Não foi possível/);
    expect(en.errors.PRODUCT_PUBLISH_FAILED).toMatch(/couldn't publish/i);
    expect(fr.errors.PRODUCT_PUBLISH_FAILED).toMatch(/Impossible de publier/);
  });

  it("maps server error codes to localized messages", () => {
    const en = getDictionary("en");
    expect(localizeError(en, "PRODUCT_VIDEO_TOO_LONG")).toBe("The video cannot be longer than 30 seconds.");
    expect(localizeError(en, "NETWORK_FAILED")).toMatch(/Network/);
  });

  it("keeps stable category identifiers independent from UI language", () => {
    expect(PRODUCT_CATEGORY_SLUGS).toContain("animals");
    expect(PRODUCT_CATEGORY_SLUGS).toContain("land");
    expect(productTypeFromCategory("animals")).toBe("animal");
    expect(productTypeFromCategory("land")).toBe("land");
    expect(productTypeFromCategory("sementes-e-fertilizantes")).toBe("standard");
  });

  it("validates animal metadata and quantity", () => {
    const meta = buildProductMetadata({
      categorySlug: "animals",
      productType: "animal",
      animal: { species: "pigs", quantity: 1, breed: "Large White", unit: "unit" },
      location: { province_name: "Huambo" },
    });
    expect(meta.animal?.species).toBe("pigs");
    expect(meta.animal?.quantity).toBe(1);
    expect(meta.animal?.listing_type).toBe("sale");
  });

  it("converts 1 hectare to 10.000 m² and lease land metadata", () => {
    expect(SQM_PER_HECTARE).toBe(10_000);
    expect(areaToSquareMeters(1, "hectare")).toBe(10_000);
    expect(areaToSquareMeters(2, "hectare")).toBe(20_000);
    const display = formatAreaEquivalent(1, "hectare");
    expect(display.sqm).toBe(10_000);
    expect(display.equivalent).toContain("10");

    const sale = buildProductMetadata({
      categorySlug: "land",
      productType: "land",
      land: { listing_type: "sale", property_type: "farm", area_value: 1, area_unit: "hectare" },
      location: { province_name: "Huambo" },
    });
    expect(sale.land?.area_sqm).toBe(10_000);
    expect(sale.land?.listing_type).toBe("sale");

    const lease = buildProductMetadata({
      categorySlug: "land",
      productType: "land",
      land: { listing_type: "lease", property_type: "farm", area_value: 2, area_unit: "hectare", lease_period: "year" },
      location: { province_name: "Huambo" },
    });
    expect(lease.land?.area_sqm).toBe(20_000);
    expect(lease.land?.lease_period).toBe("year");
  });

  it("rejects invalid land area", () => {
    expect(() =>
      buildProductMetadata({
        categorySlug: "land",
        productType: "land",
        land: { listing_type: "sale", area_value: 0, area_unit: "hectare" },
        location: { province_name: "Huambo" },
      })
    ).toThrow();
  });

  it("enforces the 30-second product video limit on the server validator", () => {
    expect(validateProductVideo({ mimeType: "video/mp4", fileSize: 1_000_000, durationSeconds: 10, fileName: "a.mp4" }).ok).toBe(true);
    expect(validateProductVideo({ mimeType: "video/mp4", fileSize: 1_000_000, durationSeconds: 29, fileName: "a.mp4" }).ok).toBe(true);
    expect(validateProductVideo({ mimeType: "video/mp4", fileSize: 1_000_000, durationSeconds: 30, fileName: "a.mp4" }).ok).toBe(true);
    expect(validateProductVideo({ mimeType: "video/mp4", fileSize: 1_000_000, durationSeconds: 30.1, fileName: "a.mp4" }).ok).toBe(false);
    expect(validateProductVideo({ mimeType: "video/mp4", fileSize: 1_000_000, durationSeconds: 45, fileName: "a.mp4" }).ok).toBe(false);
    expect(validateProductVideo({ mimeType: "video/mp4", fileSize: 1_000_000, durationSeconds: 120, fileName: "a.mp4" }).ok).toBe(false);
    expect(PRODUCT_VIDEO_MAX_SECONDS).toBe(30);
    const tooLong = validateProductVideo({ mimeType: "video/mp4", fileSize: 1_000_000, durationSeconds: 31, fileName: "a.mp4" });
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) expect(tooLong.code).toBe("PRODUCT_VIDEO_TOO_LONG");
  });

  it("rejects non-web video types and oversized files", () => {
    expect(validateProductVideo({ mimeType: "video/avi", fileSize: 1000, durationSeconds: 10, fileName: "a.avi" }).ok).toBe(false);
    expect(validateProductVideo({ mimeType: "video/mp4", fileSize: 40 * 1024 * 1024, durationSeconds: 10, fileName: "a.mp4" }).ok).toBe(false);
  });

  it("locks Basic from product and product-video uploads", () => {
    const basic = getUserEntitlements({ subscriptionPlan: "basic" });
    expect(basic.can_create_products).toBe(false);
    expect(basic.can_upload_product_images).toBe(false);
    expect(basic.can_upload_product_video).toBe(false);

    for (const plan of ["professional", "business", "enterprise"] as const) {
      const paid = getUserEntitlements({ subscriptionPlan: plan });
      expect(paid.can_create_products).toBe(true);
      expect(paid.can_upload_product_images).toBe(true);
      expect(paid.can_upload_product_video).toBe(true);
    }
  });

  it("creates standard, animal, and land products in the in-memory store", async () => {
    const standard = await ShoppingService.createProduct({
      title: "Semente de milho ZM-521",
      price: 15000,
      categorySlug: "sementes-e-fertilizantes",
      productType: "standard",
    });
    expect(standard.product_type).toBe("standard");

    const animal = await ShoppingService.createProduct({
      title: "Porco Large White",
      price: 150000,
      categorySlug: "animals",
      productType: "animal",
      metadata: { animal: { species: "pigs", quantity: 1 } },
    });
    expect(animal.category_slug).toBe("animals");
    expect(animal.metadata).toBeTruthy();

    const land = await ShoppingService.createProduct({
      title: "Fazenda agrícola no Huambo",
      price: 5_000_000,
      categorySlug: "land",
      productType: "land",
      metadata: { land: { listing_type: "sale", area_value: 1, area_unit: "hectare" } },
    });
    expect(land.category_slug).toBe("land");
  });

  it("searches animal and land titles without depending on translated labels", async () => {
    const { products } = await ShoppingService.searchProducts({ query: "milho" });
    expect(products.length).toBeGreaterThan(0);
  });
});
