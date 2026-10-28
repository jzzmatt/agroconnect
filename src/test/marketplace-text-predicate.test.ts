import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { productCandidateSql, serviceCandidateSql } from "@/lib/cloudhike/marketplace-search";
import {
  MARKETPLACE_PRODUCT_TEXT_SQL,
  MARKETPLACE_SERVICE_TEXT_SQL,
} from "@/lib/geospatial/marketplace-text-predicate";

describe("marketplace text predicate", () => {
  it("keeps the product RPC combination of Portuguese full text and ILIKE", () => {
    const sql = readFileSync(
      "supabase/migrations/20260822000002_012_agrishopping_products_marketplace.sql",
      "utf8",
    );
    expect(sql).toContain("to_tsvector('portuguese'");
    expect(sql).toContain("plainto_tsquery('portuguese', p_query)");
    expect(sql).toContain("p.title ILIKE '%' || p_query || '%'");
    expect(sql).toContain("p.description ILIKE '%' || p_query || '%'");
    expect(sql).toContain("pp.business_name ILIKE '%' || p_query || '%'");
    expect(MARKETPLACE_PRODUCT_TEXT_SQL).toContain("plainto_tsquery('portuguese', $1::text)");
    expect(MARKETPLACE_PRODUCT_TEXT_SQL).toContain("description ILIKE");
    expect(MARKETPLACE_PRODUCT_TEXT_SQL).toContain("seller_name ILIKE");
    expect(productCandidateSql()).toContain(MARKETPLACE_PRODUCT_TEXT_SQL.trim());
    expect(productCandidateSql()).not.toMatch(/\b(LIMIT|OFFSET)\b/);
  });

  it("keeps the service RPC fields, including description in full text only", () => {
    const sql = readFileSync(
      "supabase/migrations/20260824000002_026_marketplace_search_rpc_grants.sql",
      "utf8",
    );
    expect(sql).toContain("coalesce(s.short_description, '')");
    expect(sql).toContain("s.short_description ILIKE '%' || p_query || '%'");
    expect(sql).not.toContain("s.description ILIKE");
    const ilikeLines = MARKETPLACE_SERVICE_TEXT_SQL.split("\n").filter((line) => line.includes("ILIKE"));
    expect(ilikeLines.map((line) => line.trim())).toEqual([
      "OR title ILIKE '%' || $1::text || '%'",
      "OR short_description ILIKE '%' || $1::text || '%'",
      "OR provider_name ILIKE '%' || $1::text || '%'",
    ]);
    expect(MARKETPLACE_SERVICE_TEXT_SQL).toContain("coalesce(description, '')");
    expect(serviceCandidateSql()).not.toMatch(/\b(LIMIT|OFFSET)\b/);
  });

  it("leaves full text out of the page formatter and the live Supabase path", () => {
    const page = readFileSync("src/lib/geospatial/catalogue-page.ts", "utf8");
    const shopping = readFileSync("src/lib/services/shopping-service.ts", "utf8");
    const marketplace = readFileSync("src/lib/services/marketplace-service.ts", "utf8");
    const session = readFileSync("src/lib/cloudhike/require-clerk-session.ts", "utf8");
    expect(page).toContain("Text search stays in SQL");
    expect(page).not.toContain("plainto_tsquery");
    expect(shopping).toContain("search_marketplace_products");
    expect(shopping).not.toContain("pageMarketplaceCatalogue");
    expect(shopping).not.toContain("searchCloudhikeMarketplaceProducts");
    expect(marketplace).toContain("search_marketplace_services");
    expect(marketplace).not.toContain("searchCloudhikeMarketplaceServices");
    expect(session).toContain("auth()");
    expect(session).toContain("sessionFromClerkAuth");
    expect(session).not.toContain("sessionClaims");
    expect(session).not.toContain("jwt.verify");
  });
});
