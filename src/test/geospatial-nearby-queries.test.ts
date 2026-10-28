import { describe, expect, it } from "vitest";
import {
  entitiesInBounds,
  nearbyAgriculturalResources,
  nearbyProducts,
  nearbyServices,
  type BoundsRecord,
  type NearbyRecord,
} from "@/lib/geospatial/nearby-queries";
import { wgs84Direct, wgs84DistanceMetres } from "@/lib/geospatial/wgs84-distance";

const LUANDA = { latitude: -8.8383, longitude: 13.2344 };

describe("nearby and bounds replacements", () => {
  const catalogue = baselineNearby();

  it("uses the service OR rule and the buyer-only rule for products and resources", () => {
    const services = nearbyServices(catalogue, { ...LUANDA, radiusKm: 10 });
    expect(services.rejected).toBe(false);
    expect(services.rows.map((row) => row.id)).toEqual(["luanda", "n_10", "n_49_9", "n_50"]);
    expect(services.rows.find((row) => row.id === "n_50")?.withinCoverage).toBe(true);
    expect(services.totalCount).toBe(4);

    const products = nearbyProducts(catalogue, { ...LUANDA, radiusKm: 10 });
    expect(products.rows.map((row) => row.id)).toEqual(["luanda", "n_10"]);

    const resources = nearbyAgriculturalResources(catalogue, { ...LUANDA, radiusKm: 100 });
    expect(resources.rows.map((row) => row.id)).toEqual(["luanda", "n_10", "n_49_9", "n_50", "n_50_1", "n_80"]);
    expect(resources.rows.every((row) => row.withinCoverage == null)).toBe(true);
  });

  it("caps a 250 km request at 200 km and keeps the boundary inclusive", () => {
    const capped = nearbyProducts(catalogue, { ...LUANDA, radiusKm: 250 });
    expect(capped.rows.map((row) => row.id)).toContain("n_190");
    expect(capped.rows.map((row) => row.id)).not.toContain("n_210");

    const boundary = nearbyProducts(
      [
        { id: "on", ...wgs84Direct(LUANDA, 0, 50_000), status: "active" },
        { id: "out", ...wgs84Direct(LUANDA, 0, 50_000.001), status: "active" },
        { id: "zero", ...LUANDA, status: "active" },
      ],
      { ...LUANDA, radiusKm: 50 },
    );
    expect(boundary.rows.map((row) => row.id)).toEqual(["zero", "on"]);
    expect(boundary.rows[0]?.distanceMetres).toBe(0);
  });

  it("rejects invalid search coordinates and excludes null locations only while searching", () => {
    const rejected = nearbyServices(catalogue, { latitude: 95, longitude: 13, radiusKm: 10 });
    expect(rejected.rejected).toBe(true);
    expect(rejected.message).toBe("Coordenadas inválidas fornecidas.");
    expect(rejected.rows).toEqual([]);

    const missingSearch = nearbyProducts(catalogue, { latitude: null, longitude: null, radiusKm: 10 });
    expect(missingSearch.rejected).toBe(false);
    expect(missingSearch.rows).toEqual([]);

    const stored = nearbyProducts(
      [{ id: "folded", latitude: 95, longitude: 200, status: "active" }],
      { ...LUANDA, radiusKm: 200 },
    );
    expect(stored.rows).toEqual([]);
    expect(wgs84DistanceMetres({ latitude: 85, longitude: -160 }, LUANDA)).toBeGreaterThan(10_000_000);
  });

  it("defaults a null nearby radius to 50 km and ignores inactive rows", () => {
    const defaults = nearbyServices(
      [
        { id: "inside", ...wgs84Direct(LUANDA, 0, 40_000), status: "active", coverageRadiusKm: 1 },
        { id: "draft", ...wgs84Direct(LUANDA, 0, 1_000), status: "draft", coverageRadiusKm: 50 },
      ],
      { ...LUANDA, radiusKm: null },
    );
    expect(defaults.rows.map((row) => row.id)).toEqual(["inside"]);
    expect(defaults.rows[0]?.withinCoverage).toBe(false);
  });

  it("does not drop an included buyer-only point at the antimeridian or near a pole", () => {
    const east = { latitude: 0, longitude: 179.9 };
    const across = wgs84Direct(east, 90, 10_000);
    const polar = { latitude: 89.2, longitude: 10 };
    const beyondPole = wgs84Direct(polar, 0, 20_000);
    const rows: NearbyRecord[] = [
      { id: "across", ...across, status: "active" },
      { id: "pole", ...beyondPole, status: "active" },
      { id: "far", latitude: -40, longitude: -40, status: "active" },
    ];
    const antimeridian = nearbyProducts(rows, { ...east, radiusKm: 50 });
    expect(antimeridian.rows.map((row) => row.id)).toContain("across");
    const pole = nearbyProducts(rows, { ...polar, radiusKm: 50 });
    expect(pole.rows.map((row) => row.id)).toContain("pole");
    expect(pole.rows.map((row) => row.id)).not.toContain("far");
  });

  it("includes boundary points in a bounds query and keeps a stable type order", () => {
    const records: BoundsRecord[] = [
      { id: "p2", entityType: "product", latitude: -8, longitude: 13, status: "active" },
      { id: "s2", entityType: "service", latitude: -8, longitude: 13, status: "active" },
      { id: "s1", entityType: "service", latitude: -9, longitude: 12, status: "active" },
      { id: "outside", entityType: "service", latitude: 1, longitude: 1, status: "active" },
      { id: "missing", entityType: "product", latitude: null, longitude: null, status: "active" },
      { id: "draft", entityType: "service", latitude: -8, longitude: 13, status: "draft" },
      { id: "edge", entityType: "agricultural_resource", latitude: -10, longitude: 14, status: "active" },
      { id: "folded", entityType: "product", latitude: 95, longitude: 13, status: "active" },
    ];
    const result = entitiesInBounds(records, {
      minLatitude: -10,
      minLongitude: 14,
      maxLatitude: -8,
      maxLongitude: 12,
      limit: 10,
    });
    expect(result.issue).toBeNull();
    expect(result.rows.map((row) => row.id)).toEqual(["s1", "s2", "p2", "edge"]);
    expect(result.matchedCount).toBe(4);
    const folded = entitiesInBounds(records, {
      minLatitude: 80,
      minLongitude: 12,
      maxLatitude: 90,
      maxLongitude: 14,
    });
    expect(folded.rows.map((row) => row.id)).toEqual(["folded"]);

    const page = entitiesInBounds(records, {
      minLatitude: -10,
      minLongitude: 12,
      maxLatitude: -8,
      maxLongitude: 14,
      limit: 2,
    });
    expect(page.rows.map((row) => row.id)).toEqual(["s1", "s2"]);
    expect(page.matchedCount).toBe(4);
  });

  it("normalises a reversed bounds box instead of wrapping the antimeridian", () => {
    const records: BoundsRecord[] = [
      { id: "date-line", entityType: "service", latitude: 0, longitude: 179, status: "active" },
      { id: "greenwich", entityType: "service", latitude: 0, longitude: 0, status: "active" },
    ];
    const result = entitiesInBounds(records, {
      minLatitude: -1,
      minLongitude: 170,
      maxLatitude: 1,
      maxLongitude: -170,
    });
    expect(result.rows.map((row) => row.id)).toEqual(["greenwich"]);
  });
});

function baselineNearby(): NearbyRecord[] {
  const placed = (id: string, metres: number, coverageRadiusKm: number): NearbyRecord => ({
    id,
    ...wgs84Direct(LUANDA, 0, metres),
    coverageRadiusKm,
    status: "active",
  });
  return [
    { id: "luanda", ...LUANDA, coverageRadiusKm: 50, status: "active" },
    placed("n_10", 10_000, 50),
    placed("n_49_9", 49_900, 50),
    placed("n_50", 50_000, 50),
    placed("n_50_1", 50_100, 50),
    placed("n_80", 80_000, 50),
    placed("n_190", 190_000, 20),
    placed("n_210", 210_000, 50),
    { id: "missing", latitude: null, longitude: null, coverageRadiusKm: 50, status: "active" },
  ];
}
