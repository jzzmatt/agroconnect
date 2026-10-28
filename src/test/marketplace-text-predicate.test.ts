import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MARKETPLACE_PRODUCT_TEXT_SQL } from "@/lib/geospatial/marketplace-text-predicate";

describe("marketplace text predicate", () => {
  it("keeps the RPC combination of Portuguese full text and ILIKE", () => {
    const sql = readFileSync(
      "supabase/migrations/20260822000002_012_agrishopping_products_marketplace.sql",
      "utf8",
    );
    expect(sql).toContain("to_tsvector('portuguese'");
    expect(sql).toContain("plainto_tsquery('portuguese', p_query)");
    expect(sql).toContain("p.title ILIKE '%' || p_query || '%'");
    expect(MARKETPLACE_PRODUCT_TEXT_SQL).toContain("to_tsvector");
    expect(MARKETPLACE_PRODUCT_TEXT_SQL).toContain("ILIKE");
  });

  it("leaves full text out of the application page function", () => {
    const page = readFileSync("src/lib/geospatial/catalogue-page.ts", "utf8");
    const shopping = readFileSync("src/lib/services/shopping-service.ts", "utf8");
    expect(page).toContain("Text search stays in SQL");
    expect(page).not.toContain("plainto_tsquery");
    expect(shopping).toContain("search_marketplace_products");
    expect(shopping).not.toContain("pageMarketplaceCatalogue");
  });
});
