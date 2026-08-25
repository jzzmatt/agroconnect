import { describe, it, expect } from "vitest";
import {
  ShoppingService,
  INITIAL_PRODUCTS,
} from "@/lib/services/shopping-service";
import {
  isPublicProductStatus,
  PUBLIC_PRODUCT_STATUSES,
} from "@/lib/products/publication";
import {
  buildInventoryPatch,
  deriveAvailabilityFromQuantity,
} from "@/lib/products/inventory";
import { resolveAgriprofileNavHref } from "@/lib/agriprofile/paths";

describe("Phase 6 — AgriShopping publication & workspace", () => {
  it("1. Public product statuses include published and active only", () => {
    expect(PUBLIC_PRODUCT_STATUSES).toEqual(["published", "active"]);
    expect(isPublicProductStatus("published")).toBe(true);
    expect(isPublicProductStatus("draft")).toBe(false);
    expect(isPublicProductStatus("paused")).toBe(false);
    expect(isPublicProductStatus("archived")).toBe(false);
  });

  it("2. Marketplace search excludes draft and paused seed products", async () => {
    const result = await ShoppingService.searchProducts({ query: "rascunho" });
    expect(result.products.length).toBe(0);

    const paused = await ShoppingService.searchProducts({ query: "pausado" });
    expect(paused.products.length).toBe(0);

    const published = await ShoppingService.searchProducts({ query: "milho" });
    expect(published.products.length).toBeGreaterThan(0);
  });

  it("3. getProductBySlug hides non-published products from public reads", async () => {
    const draft = await ShoppingService.getProductBySlug("rascunho-semente-feijao-draft");
    expect(draft).toBeNull();

    const paused = await ShoppingService.getProductBySlug("produto-pausado-motobomba-diesel-5hp");
    expect(paused).toBeNull();

    const published = await ShoppingService.getProductBySlug("semente-milho-hibrido-zm521-25kg");
    expect(published).not.toBeNull();
  });

  it("4. getSellerProducts onlyPublished filters owner catalog correctly", async () => {
    const all = await ShoppingService.getSellerProducts("prov-seed-1", false);
    expect(all.some((p) => p.status === "draft")).toBe(true);

    const publishedOnly = await ShoppingService.getSellerProducts("prov-seed-1", true);
    expect(publishedOnly.every((p) => isPublicProductStatus(p.status))).toBe(true);
    expect(publishedOnly.some((p) => p.id === "prd-seed-draft")).toBe(false);
  });

  it("5. getProductById returns draft for seller workspace reads", async () => {
    const draft = await ShoppingService.getProductById("prd-seed-draft", "prov-seed-1");
    expect(draft).not.toBeNull();
    expect(draft?.status).toBe("draft");
  });

  it("6. Inventory patch derives availability from quantity", () => {
    expect(deriveAvailabilityFromQuantity(0)).toBe("out_of_stock");
    expect(deriveAvailabilityFromQuantity(12)).toBe("in_stock");
    expect(buildInventoryPatch({ quantity: 0 })).toEqual({
      quantity: 0,
      availability_status: "out_of_stock",
    });
  });

  it("7. updateInventory mutates in-memory seed catalog", async () => {
    const productId = "prd-seed-1";
    const before = await ShoppingService.getProductById(productId, "prov-seed-1");
    const originalQty = before?.quantity ?? 80;
    const ok = await ShoppingService.updateInventory(productId, "prov-seed-1", {
      quantity: 42,
    });
    expect(ok).toBe(true);
    const product = await ShoppingService.getProductById(productId, "prov-seed-1");
    expect(product?.quantity).toBe(42);
    await ShoppingService.updateInventory(productId, "prov-seed-1", {
      quantity: originalQty,
    });
  });

  it("8. resolveAgriprofileNavHref maps legacy dashboard product routes", () => {
    expect(resolveAgriprofileNavHref("/dashboard/products", "user_abc")).toBe(
      "/user_abc/agriprofile/products"
    );
    expect(resolveAgriprofileNavHref("/dashboard/products/new", "user_abc")).toBe(
      "/user_abc/agriprofile/products/new"
    );
    expect(resolveAgriprofileNavHref("/dashboard", "user_abc")).toBe(
      "/user_abc/agriprofile"
    );
  });

  it("9. Seed catalog contains lifecycle fixtures for draft and paused states", () => {
    expect(INITIAL_PRODUCTS.some((p) => p.status === "draft")).toBe(true);
    expect(INITIAL_PRODUCTS.some((p) => p.status === "paused")).toBe(true);
  });
});
