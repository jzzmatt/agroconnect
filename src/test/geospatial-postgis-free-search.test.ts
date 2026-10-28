import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { searchWithoutPostgis, type RadiusRecord } from "@/lib/geospatial/postgis-free-search";
import { wgs84Direct, wgs84DistanceMetres } from "@/lib/geospatial/wgs84-distance";

const LUANDA = { latitude: -8.8383, longitude: 13.2344 };

describe("PostGIS-free radius search", () => {
  const catalogue = baselineCatalogue();

  it("matches the Phase 1.1 inclusion cases for a 10 km buyer radius", () => {
    const result = searchWithoutPostgis(catalogue, { ...LUANDA, buyerRadiusKm: 10 });
    expect(result.spatialPredicateApplied).toBe(true);
    expect(result.includedIds).toEqual(["luanda", "n_10", "n_49_9", "n_50"]);
    expect(result.candidateIds).toEqual(expect.arrayContaining(result.includedIds));
    expect(hit(result, "n_10").reason).toBe("both");
    expect(hit(result, "n_49_9").reason).toBe("coverage_radius");
    expect(hit(result, "n_50").reason).toBe("coverage_radius");
    expect(hit(result, "n_50_1").included).toBe(false);
    expect(hit(result, "n_80").included).toBe(false);
    expect(hit(result, "n_190").included).toBe(false);
    expect(hit(result, "n_210").included).toBe(false);
    expect(hit(result, "missing").included).toBe(false);
    expect(hit(result, "missing").distanceMetres).toBeNull();
    expect(result.candidateIds).not.toContain("n_210");
    for (const id of result.includedIds) {
      if (id === "luanda") {
        expect(hit(result, id).distanceMetres).toBe(0);
      } else {
        expect(hit(result, id).distanceMetres).toBeCloseTo(expectedMetres(id), 3);
      }
    }
  });

  it("includes 80 km inside a 100 km buyer radius and applies the 200 km cap", () => {
    const at100 = searchWithoutPostgis(catalogue, { ...LUANDA, buyerRadiusKm: 100 });
    expect(hit(at100, "n_80").included).toBe(true);
    expect(hit(at100, "n_80").reason).toBe("buyer_radius");

    const capped = searchWithoutPostgis(catalogue, { ...LUANDA, buyerRadiusKm: 250 });
    expect(hit(capped, "n_190").included).toBe(true);
    expect(hit(capped, "n_190").reason).toBe("buyer_radius");
    expect(hit(capped, "n_210").included).toBe(false);
    expect(capped.prefilterRadiusMetres).toBe(200_000);
  });

  it("skips the spatial predicate when buyer coordinates or the buyer radius are omitted", () => {
    const omittedPoint = searchWithoutPostgis(catalogue, {
      latitude: null,
      longitude: null,
      buyerRadiusKm: 10,
    });
    expect(omittedPoint.spatialPredicateApplied).toBe(false);
    expect(omittedPoint.includedIds).toHaveLength(catalogue.length);
    expect(hit(omittedPoint, "missing").included).toBe(true);

    const omittedRadius = searchWithoutPostgis(catalogue, { ...LUANDA, buyerRadiusKm: null });
    expect(omittedRadius.spatialPredicateApplied).toBe(false);
    expect(hit(omittedRadius, "n_210").included).toBe(true);
    expect(hit(omittedRadius, "n_10").distanceMetres).toBeCloseTo(10_000, 3);
  });

  it("coerces invalid marketplace coordinates and rejects non-finite search input", () => {
    const coerced = searchWithoutPostgis(
      [{ id: "anchor", ...LUANDA, coverageRadiusKm: 50 }],
      { latitude: 95, longitude: 13.2344, buyerRadiusKm: 200 },
    );
    expect(coerced.coercedSearchCoordinate).toBe(true);
    expect(coerced.searchCoordinate).toEqual({ latitude: 85, longitude: 13.2344 });
    expect(hit(coerced, "anchor").included).toBe(false);
    expect(coerced.candidateIds).not.toContain("anchor");
    expect(
      wgs84DistanceMetres(
        { latitude: 85, longitude: 13.2344 },
        LUANDA,
      ),
    ).toBeGreaterThan(10_000_000);

    const stored = searchWithoutPostgis(
      [{ id: "bad", latitude: 95, longitude: 200, coverageRadiusKm: 50 }],
      { ...LUANDA, buyerRadiusKm: 200 },
    );
    expect(hit(stored, "bad").coerced).toBe(true);
    expect(hit(stored, "bad").coordinateIssue).toBe("out_of_range");
    expect(hit(stored, "bad").included).toBe(false);

    const nonFinite = searchWithoutPostgis(catalogue, {
      latitude: Number.NaN,
      longitude: 13,
      buyerRadiusKm: 10,
    });
    expect(nonFinite.searchIssue).toBe("non_finite");
    expect(nonFinite.includedIds).toEqual([]);
  });

  it("includes the exact boundary and excludes a point one millimetre outside", () => {
    const onBoundary = wgs84Direct(LUANDA, 0, 50_000);
    const justOutside = wgs84Direct(LUANDA, 0, 50_000.001);
    const records: RadiusRecord[] = [
      { id: "boundary", ...onBoundary, coverageRadiusKm: 0 },
      { id: "outside", ...justOutside, coverageRadiusKm: 0 },
      { id: "same", ...LUANDA, coverageRadiusKm: 0 },
    ];
    const result = searchWithoutPostgis(records, { ...LUANDA, buyerRadiusKm: 50 });
    expect(hit(result, "boundary").included).toBe(true);
    expect(hit(result, "outside").included).toBe(false);
    expect(hit(result, "same").distanceMetres).toBe(0);
    expect(hit(result, "same").reason).toBe("both");
  });

  it("does not let the candidate box drop an included record", () => {
    const records = denseCatalogue(2_000);
    const result = searchWithoutPostgis(records, { ...LUANDA, buyerRadiusKm: 25 });
    const full = records.filter((record) => {
      if (record.latitude == null || record.longitude == null) return false;
      const distance = wgs84DistanceMetres(LUANDA, {
        latitude: record.latitude,
        longitude: record.longitude,
      });
      const coverage = (record.coverageRadiusKm ?? 50) * 1000;
      return distance <= 25_000 || distance <= coverage;
    });
    for (const record of full) {
      expect(result.candidateIds).toContain(record.id);
      expect(result.includedIds).toContain(record.id);
    }
    expect(result.metrics.candidateCount).toBeLessThan(records.length);
    expect(result.metrics.candidateCount).toBeGreaterThanOrEqual(result.metrics.includedCount);
  });

  it("leaves the live marketplace and shopping RPC paths unchanged", () => {
    const shopping = readFileSync("src/lib/services/shopping-service.ts", "utf8");
    const marketplace = readFileSync("src/lib/services/marketplace-service.ts", "utf8");
    expect(shopping).toContain("search_marketplace_products");
    expect(marketplace).toContain("search_marketplace_services");
    expect(shopping).not.toContain("searchWithoutPostgis");
    expect(marketplace).not.toContain("searchWithoutPostgis");
    expect(shopping).toContain("const R = 6371");
  });
});

function baselineCatalogue(): RadiusRecord[] {
  const placed = (id: string, metres: number, coverageRadiusKm: number): RadiusRecord => {
    const coordinate = wgs84Direct(LUANDA, 0, metres);
    return { id, ...coordinate, coverageRadiusKm };
  };
  return [
    { id: "luanda", ...LUANDA, coverageRadiusKm: 50 },
    placed("n_10", 10_000, 50),
    placed("n_49_9", 49_900, 50),
    placed("n_50", 50_000, 50),
    placed("n_50_1", 50_100, 50),
    placed("n_80", 80_000, 50),
    placed("n_190", 190_000, 20),
    placed("n_210", 210_000, 50),
    { id: "missing", latitude: null, longitude: null, coverageRadiusKm: 50 },
  ];
}

function expectedMetres(id: string): number {
  const metres: Record<string, number> = {
    n_10: 10_000,
    n_49_9: 49_900,
    n_50: 50_000,
    n_50_1: 50_100,
    n_80: 80_000,
    n_190: 190_000,
    n_210: 210_000,
  };
  return metres[id] ?? 0;
}

function denseCatalogue(count: number): RadiusRecord[] {
  const random = mulberry32(11);
  const records: RadiusRecord[] = [];
  for (let index = 0; index < count; index += 1) {
    records.push({
      id: `p${index}`,
      latitude: -18 + random() * 16,
      longitude: 11 + random() * 13,
      coverageRadiusKm: random() > 0.9 ? 80 : 20,
    });
  }
  records.push({ id: "edge", ...wgs84Direct(LUANDA, 35, 24_999), coverageRadiusKm: 1 });
  return records;
}

function hit(result: { hits: { id: string; included: boolean; reason: string | null; distanceMetres: number | null; coordinateIssue: string | null; coerced: boolean }[] }, id: string) {
  const found = result.hits.find((entry) => entry.id === id);
  if (!found) throw new Error(`Missing hit ${id}`);
  return found;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
