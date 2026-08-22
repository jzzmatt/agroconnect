import { describe, it, expect } from "vitest";
import {
  ShoppingService,
  INITIAL_PRODUCTS,
  INITIAL_SELLERS,
  slugifyProduct,
} from "@/lib/services/shopping-service";
import { MarketplaceService } from "@/lib/services/marketplace-service";

describe("AGROCONNECT Phase 7 — AgriShopping Products Marketplace", () => {
  it("1. Slugify utility produces URL-safe product slugs", () => {
    expect(slugifyProduct("Semente de Milho Híbrido 25kg")).toBe("semente-de-milho-hibrido-25kg");
    expect(slugifyProduct("Bomba de Irrigação Solar 3HP")).toBe("bomba-de-irrigacao-solar-3hp");
    expect(slugifyProduct("Adubo Composto NPK 12-24-12 (50kg)")).toBe("adubo-composto-npk-12-24-12-50kg");
  });

  it("2. Searches and filters published products by keyword", async () => {
    const result = await ShoppingService.searchProducts({
      query: "milho",
    });

    expect(result.products.length).toBeGreaterThan(0);
    expect(
      result.products.some(
        (p) =>
          p.title.toLowerCase().includes("milho") ||
          (p.description && p.description.toLowerCase().includes("milho"))
      )
    ).toBe(true);
  });

  it("3. Filters products by province (Angola geography)", async () => {
    const huamboProducts = await ShoppingService.searchProducts({
      provinceName: "Huambo",
    });
    expect(huamboProducts.products.length).toBeGreaterThan(0);
    expect(huamboProducts.products.every((p) => p.province_name?.toLowerCase() === "huambo")).toBe(true);

    const benguelaProducts = await ShoppingService.searchProducts({
      provinceName: "Benguela",
    });
    expect(benguelaProducts.products.length).toBeGreaterThan(0);
    expect(benguelaProducts.products.every((p) => p.province_name?.toLowerCase() === "benguela")).toBe(true);
  });

  it("4. Calculates distance and filters products within geographic selling radius (PostGIS / Haversine)", async () => {
    // User coordinates near Huambo (-12.7833, 15.7333)
    const result = await ShoppingService.searchProducts({
      latitude: -12.7833,
      longitude: 15.7333,
      radiusKm: 80,
      sortBy: "distance",
    });

    expect(result.products.length).toBeGreaterThan(0);
    const firstProduct = result.products[0];
    expect(firstProduct.distance_km).toBeDefined();
    expect(firstProduct.distance_km).toBeLessThanOrEqual(80);
    expect(firstProduct.is_within_selling_area).toBe(true);
  });

  it("5. Retrieves product details by public slug", async () => {
    const slug = "semente-milho-hibrido-zm521-25kg";
    const product = await ShoppingService.getProductBySlug(slug);

    expect(product).not.toBeNull();
    expect(product?.slug).toBe(slug);
    expect(product?.title).toBe("Semente de Milho Híbrido Certificada ZM-521 (25kg)");
    expect(product?.price).toBe(28500);
    expect(product?.currency).toBe("AOA");
    expect(product?.unit).toBe("saco 25kg");
    expect(product?.seller_name).toContain("Dr. João Silva");
  });

  it("6. Retrieves seller products and verifies seller relationship", async () => {
    const sellerId = "prov-seed-2";
    const products = await ShoppingService.getSellerProducts(sellerId);

    expect(products.length).toBeGreaterThan(0);
    expect(products.every((p) => p.seller_id === sellerId)).toBe(true);
  });

  it("7. Filters products by availability status", async () => {
    const inStockResult = await ShoppingService.searchProducts({
      availabilityStatus: "in_stock",
    });
    expect(inStockResult.products.length).toBeGreaterThan(0);
    expect(inStockResult.products.every((p) => p.availability_status === "in_stock")).toBe(true);
  });

  it("8. Filters products by price range (min and max price)", async () => {
    const priceRangeResult = await ShoppingService.searchProducts({
      minPrice: 20000,
      maxPrice: 50000,
    });
    expect(priceRangeResult.products.length).toBeGreaterThan(0);
    expect(
      priceRangeResult.products.every((p) => p.price >= 20000 && p.price <= 50000)
    ).toBe(true);
  });

  it("9. Validates sorting logic by price ascending and descending", async () => {
    const ascResult = await ShoppingService.searchProducts({ sortBy: "price_asc" });
    for (let i = 0; i < ascResult.products.length - 1; i++) {
      expect(ascResult.products[i].price).toBeLessThanOrEqual(ascResult.products[i + 1].price);
    }

    const descResult = await ShoppingService.searchProducts({ sortBy: "price_desc" });
    for (let i = 0; i < descResult.products.length - 1; i++) {
      expect(descResult.products[i].price).toBeGreaterThanOrEqual(descResult.products[i + 1].price);
    }
  });

  it("10. Regression Test: Verifies Phase 6 Services Marketplace still operates seamlessly", async () => {
    const services = await MarketplaceService.searchServices({ query: "irrigação" });
    expect(services.services.length).toBeGreaterThan(0);

    const serviceDetail = await MarketplaceService.getServiceBySlug("instalacao-sistemas-irrigacao-gota-a-gota");
    expect(serviceDetail).not.toBeNull();
    expect(serviceDetail?.price).toBe(35000);
  });
});
