import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { getDictionary } from "@/i18n";
import { localizeError } from "@/i18n/errors";
import { PRODUCT_ERROR_CODES } from "@/lib/products/errors";
import { countActiveProducts } from "@/lib/services/pricing-service";

describe("Phase 9.8 — localization button, images, soft delete", () => {
  it("replaces the product detail map with a compact AgriLocalização deep link", () => {
    const page = readFileSync("src/app/agrishopping/products/[slug]/page.tsx", "utf8");
    expect(page).toContain("/agrilocalizacao?vendorId=");
    expect(page).toContain("dict.location.viewOnMap");
    expect(page).not.toContain("<LocationMap");
  });

  it("uses a consistent 4/3 cover image on cards and detail pages", () => {
    const card = readFileSync("src/components/shopping/ShoppingProductCard.tsx", "utf8");
    const detail = readFileSync("src/app/agrishopping/products/[slug]/page.tsx", "utf8");
    expect(card).toContain("aspect-[4/3]");
    expect(card).toContain("object-cover object-center");
    expect(detail).toContain("aspect-[4/3]");
    expect(detail).toContain("object-cover object-center");
  });

  it("loads dashboard products on the server before hydrating the client UI", () => {
    const page = readFileSync("src/app/(dashboard)/dashboard/products/page.tsx", "utf8");
    const client = readFileSync(
      "src/app/(dashboard)/dashboard/products/ProductsDashboardClient.tsx",
      "utf8"
    );
    expect(page).not.toContain('"use client"');
    expect(page).toContain("getMyProductStatsAction");
    expect(page).toContain("ProductsDashboardClient");
    expect(client).toContain("initialProducts");
    expect(client).toContain('fetch(`/api/products/');
  });

  it("exposes owner-authorized soft delete through a JSON API", () => {
    const route = readFileSync("src/app/api/products/[id]/route.ts", "utf8");
    const deleteModule = readFileSync("src/lib/products/delete-product.ts", "utf8");
    expect(route).toContain("softDeleteProduct");
    expect(route).toContain("DELETE");
    expect(deleteModule).toContain('status: "deleted"');
    expect(deleteModule).toContain("PRODUCT_DELETE_FORBIDDEN");
    expect(deleteModule).toContain("NOT_OWNER");
  });

  it("does not count deleted products toward the Professional cap", () => {
    expect(
      countActiveProducts([
        { status: "published" },
        { status: "deleted" },
      ])
    ).toBe(1);
  });

  it("localizes delete and location copy in pt, en, and fr", () => {
    for (const locale of ["pt", "en", "fr"] as const) {
      const dict = getDictionary(locale);
      expect(dict.location.viewOnMap.length).toBeGreaterThan(2);
      expect(dict.location.vendorNotFound.length).toBeGreaterThan(5);
      expect(dict.products.deleteConfirmTitle.length).toBeGreaterThan(5);
      expect(localizeError(dict, PRODUCT_ERROR_CODES.NOT_OWNER).length).toBeGreaterThan(5);
    }
  });

  it("adds deleted to the products status constraint in SQL", () => {
    const migration = readFileSync(
      "supabase/migrations/20260822000015_025_phase98_product_soft_delete.sql",
      "utf8"
    );
    expect(migration).toContain("'deleted'");
  });
});
