import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MapQuestProvider } from "@/lib/location/providers/mapquest-map";
import { ShoppingService, INITIAL_PRODUCTS } from "@/lib/services/shopping-service";
import type { ProductListItem } from "@/types/domain";

describe("Phase 9.8 — MapQuest lifecycle", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("does not throw when initialize is called twice on the same container after destroy", async () => {
    const provider = new MapQuestProvider("test_key", "map");

    await provider.initialize({
      container,
      center: { latitude: -12.5, longitude: 17.5 },
      zoom: 6,
    });

    provider.destroy();

    const provider2 = new MapQuestProvider("test_key", "map");
    await expect(
      provider2.initialize({
        container,
        center: { latitude: -12.5, longitude: 17.5 },
        zoom: 6,
      })
    ).resolves.not.toThrow();
  });

  it("reuses existing map instance when initialize is called again", async () => {
    const provider = new MapQuestProvider("test_key", "map");

    await provider.initialize({
      container,
      center: { latitude: -12.5, longitude: 17.5 },
      zoom: 6,
    });

    await expect(
      provider.initialize({
        container,
        center: { latitude: -8.8, longitude: 13.2 },
        zoom: 10,
      })
    ).resolves.not.toThrow();

    provider.destroy();
  });
});

describe("Phase 9.8 — Product soft delete", () => {
  const slug = "semente-milho-hibrido-zm521-25kg";
  let savedProduct: ProductListItem | null = null;

  beforeEach(async () => {
    const product = await ShoppingService.getProductBySlug(slug);
    if (product) savedProduct = { ...product };
  });

  afterEach(() => {
    if (savedProduct) {
      const idx = INITIAL_PRODUCTS.findIndex((p) => p.id === savedProduct!.id);
      if (idx >= 0) {
        INITIAL_PRODUCTS[idx] = { ...savedProduct };
      }
    }
  });

  it("allows owner to soft-delete a seed product", async () => {
    const product = await ShoppingService.getProductBySlug(slug);
    expect(product).not.toBeNull();

    const result = await ShoppingService.deleteProduct(product!.id, product!.seller_id);
    expect(result.success).toBe(true);
    expect(result.productId).toBe(product!.id);

    const afterDelete = await ShoppingService.getProductBySlug(slug);
    expect(afterDelete).toBeNull();
  });

  it("rejects delete when seller does not own the product", async () => {
    const product = await ShoppingService.getProductBySlug("bomba-irrigacao-solar-3hp-paineis");
    expect(product).not.toBeNull();

    const result = await ShoppingService.deleteProduct(product!.id, "wrong-seller-id");
    expect(result.success).toBe(false);
    expect(result.code).toBe("NOT_OWNER");
  });

  it("returns NOT_FOUND for unknown product id", async () => {
    const result = await ShoppingService.deleteProduct("non-existent-id", "prov-seed-1");
    expect(result.success).toBe(false);
    expect(result.code).toBe("PRODUCT_NOT_FOUND");
  });
});
