import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pageMarketplaceCatalogue, type CatalogueRecord } from "@/lib/geospatial/catalogue-page";
import { wgs84Direct } from "@/lib/geospatial/wgs84-distance";

const LUANDA = { latitude: -8.8383, longitude: 13.2344 };

describe("marketplace catalogue page", () => {
  const catalogue = baselinePage();

  it("pages after the exact radius decision and keeps the 200 km cap", () => {
    const page = pageMarketplaceCatalogue(catalogue, {
      ...LUANDA,
      buyerRadiusKm: 250,
      sortBy: "distance",
      limit: 2,
      offset: 1,
    });
    expect(page.issue).toBeNull();
    expect(page.spatialPredicateApplied).toBe(true);
    expect(page.totalCount).toBe(7);
    expect(page.rows.map((row) => row.id)).toEqual(["n_10", "n_49_9"]);
    expect(page.rows[0]?.distanceKm).toBeCloseTo(10, 6);
    expect(page.rows.every((row) => row.distanceMetres != null)).toBe(true);
  });

  it("matches price, featured, and null ordering from the marketplace CASE expression", () => {
    const rows: CatalogueRecord[] = [
      { id: "expensive", ...LUANDA, coverageRadiusKm: 50, price: 100, createdAt: "2026-01-01T00:00:00Z", isFeatured: false },
      { id: "cheap", ...LUANDA, coverageRadiusKm: 50, price: 5, createdAt: "2026-01-03T00:00:00Z", isFeatured: false },
      { id: "missing-price", ...LUANDA, coverageRadiusKm: 50, price: null, createdAt: "2026-01-02T00:00:00Z", isFeatured: true },
      { id: "null-featured", ...LUANDA, coverageRadiusKm: 50, price: 5, createdAt: "2026-01-03T00:00:00Z", isFeatured: null },
    ];
    const ascending = pageMarketplaceCatalogue(rows, { latitude: null, longitude: null, buyerRadiusKm: null, sortBy: "price_asc" });
    expect(ascending.spatialPredicateApplied).toBe(false);
    expect(ascending.totalCount).toBe(4);
    expect(ascending.rows.map((row) => row.id)).toEqual(["null-featured", "cheap", "expensive", "missing-price"]);

    const descending = pageMarketplaceCatalogue(rows, { latitude: null, longitude: null, buyerRadiusKm: null, sortBy: "price_desc" });
    expect(descending.rows.map((row) => row.id)).toEqual(["missing-price", "expensive", "null-featured", "cheap"]);

    const featured = pageMarketplaceCatalogue(
      [
        { id: "plain", ...LUANDA, coverageRadiusKm: 1, price: 1, createdAt: "2026-02-01T00:00:00Z", isFeatured: false },
        { id: "unknown", ...LUANDA, coverageRadiusKm: 1, price: 1, createdAt: "2026-02-01T00:00:00Z", isFeatured: null },
        { id: "featured", ...LUANDA, coverageRadiusKm: 1, price: 1, createdAt: "2026-02-01T00:00:00Z", isFeatured: true },
      ],
      { latitude: null, longitude: null, buyerRadiusKm: null, sortBy: "relevance" },
    );
    expect(featured.rows.map((row) => row.id)).toEqual(["unknown", "featured", "plain"]);
  });

  it("does not let an early limit hide a closer row", () => {
    const farNew: CatalogueRecord = {
      id: "far-new",
      ...wgs84Direct(LUANDA, 0, 80_000),
      coverageRadiusKm: 1,
      price: 10,
      createdAt: "2026-03-02T00:00:00Z",
      isFeatured: true,
    };
    const closeOld: CatalogueRecord = {
      id: "close-old",
      ...wgs84Direct(LUANDA, 0, 10_000),
      coverageRadiusKm: 1,
      price: 10,
      createdAt: "2026-01-01T00:00:00Z",
      isFeatured: false,
    };
    const exact = pageMarketplaceCatalogue([farNew, closeOld], {
      ...LUANDA,
      buyerRadiusKm: 100,
      sortBy: "distance",
      limit: 1,
      offset: 0,
    });
    expect(exact.rows.map((row) => row.id)).toEqual(["close-old"]);
    expect(exact.totalCount).toBe(2);

    const premature = [farNew, closeOld]
      .slice()
      .sort((left, right) => Date.parse(String(right.createdAt)) - Date.parse(String(left.createdAt)))
      .slice(0, 1);
    expect(premature.map((row) => row.id)).toEqual(["far-new"]);
  });

  it("rejects a negative limit and caps the page at 100", () => {
    const negative = pageMarketplaceCatalogue(catalogue, { ...LUANDA, buyerRadiusKm: 10, limit: -1 });
    expect(negative.issue).toBe("invalid_limit");
    expect(negative.rows).toEqual([]);

    const capped = pageMarketplaceCatalogue(catalogue, {
      latitude: null,
      longitude: null,
      buyerRadiusKm: null,
      limit: 500,
      offset: -4,
    });
    expect(capped.limit).toBe(100);
    expect(capped.offset).toBe(0);
    expect(capped.totalCount).toBe(catalogue.length);
  });

  it("leaves the live search services on the Supabase RPCs", () => {
    const shopping = readFileSync("src/lib/services/shopping-service.ts", "utf8");
    const marketplace = readFileSync("src/lib/services/marketplace-service.ts", "utf8");
    expect(shopping).not.toContain("pageMarketplaceCatalogue");
    expect(marketplace).not.toContain("pageMarketplaceCatalogue");
    expect(shopping).not.toContain("nearbyServices");
    expect(marketplace).not.toContain("entitiesInBounds");
  });
});

function baselinePage(): CatalogueRecord[] {
  const placed = (id: string, metres: number, coverageRadiusKm: number, createdAt: string): CatalogueRecord => ({
    id,
    ...wgs84Direct(LUANDA, 0, metres),
    coverageRadiusKm,
    price: 10,
    createdAt,
    isFeatured: false,
  });
  return [
    { id: "luanda", ...LUANDA, coverageRadiusKm: 50, price: 10, createdAt: "2026-01-01T00:00:00Z", isFeatured: false },
    placed("n_10", 10_000, 50, "2026-01-02T00:00:00Z"),
    placed("n_49_9", 49_900, 50, "2026-01-03T00:00:00Z"),
    placed("n_50", 50_000, 50, "2026-01-04T00:00:00Z"),
    placed("n_50_1", 50_100, 50, "2026-01-05T00:00:00Z"),
    placed("n_80", 80_000, 50, "2026-01-06T00:00:00Z"),
    placed("n_190", 190_000, 20, "2026-01-07T00:00:00Z"),
    placed("n_210", 210_000, 50, "2026-01-08T00:00:00Z"),
    { id: "missing", latitude: null, longitude: null, coverageRadiusKm: 50, price: 10, createdAt: "2026-01-09T00:00:00Z", isFeatured: false },
  ];
}
