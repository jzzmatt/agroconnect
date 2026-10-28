/**
 * @vitest-environment node
 */
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { pointPolygonRelation, polygonPolygonRelation } from "@/lib/geospatial/polygon-relations";
import { searchWithoutPostgis, type RadiusRecord } from "@/lib/geospatial/postgis-free-search";
import { coerceGeographyCoordinate, wgs84DistanceMetres } from "@/lib/geospatial/wgs84-distance";

const postgis = localPostgisAvailable();

describe.skipIf(!postgis)("local PostGIS differential", () => {
  it("identifies the isolated local database before comparing results", () => {
    const identity = psqlJson<{ db: string; local: boolean; postgis: string }>(
      "SELECT json_build_object('db', current_database(), 'local', inet_server_addr() IS NULL, 'postgis', postgis_full_version())",
    );
    expect(identity.db).toBe("geospatial_baseline");
    expect(identity.local).toBe(true);
    expect(identity.postgis).toContain("3.4.2");
  });

  it("matches marketplace inclusion and stays within 1 metre of ST_Distance", () => {
    const rows = psqlJson<BaselineRow[]>(`
      WITH anchor AS (
        SELECT ST_SetSRID(ST_MakePoint(13.2344, -8.8383), 4326)::geography AS g
      ),
      placed AS (
        SELECT id, metres, coverage_km, ST_Project((SELECT g FROM anchor), metres, 0) AS g
        FROM (VALUES
          ('luanda', 0::float8, 50::float8),
          ('n_10', 10000, 50),
          ('n_49_9', 49900, 50),
          ('n_50', 50000, 50),
          ('n_50_1', 50100, 50),
          ('n_80', 80000, 50),
          ('n_190', 190000, 20),
          ('n_210', 210000, 50)
        ) AS v(id, metres, coverage_km)
      ),
      rebuilt AS (
        SELECT id, coverage_km,
               ST_Y(g::geometry) AS latitude,
               ST_X(g::geometry) AS longitude,
               ST_SetSRID(ST_MakePoint(ST_X(g::geometry), ST_Y(g::geometry)), 4326)::geography AS location
        FROM placed
      )
      SELECT json_agg(json_build_object(
        'id', id,
        'latitude', latitude,
        'longitude', longitude,
        'coverageKm', coverage_km,
        'distanceMetres', ST_Distance(location, (SELECT g FROM anchor)),
        'buyer10', ST_DWithin(location, (SELECT g FROM anchor), 10000)
          OR ST_DWithin(location, (SELECT g FROM anchor), coverage_km * 1000),
        'buyer100', ST_DWithin(location, (SELECT g FROM anchor), 100000)
          OR ST_DWithin(location, (SELECT g FROM anchor), coverage_km * 1000),
        'buyer250', ST_DWithin(location, (SELECT g FROM anchor), LEAST(250, 200) * 1000)
          OR ST_DWithin(location, (SELECT g FROM anchor), coverage_km * 1000)
      ) ORDER BY id)
      FROM rebuilt
    `);
    const records: RadiusRecord[] = [
      ...rows.map((row) => ({
        id: row.id,
        latitude: row.latitude,
        longitude: row.longitude,
        coverageRadiusKm: row.coverageKm,
      })),
      { id: "missing", latitude: null, longitude: null, coverageRadiusKm: 50 },
    ];
    const buyer10 = searchWithoutPostgis(records, { latitude: -8.8383, longitude: 13.2344, buyerRadiusKm: 10 });
    const buyer100 = searchWithoutPostgis(records, { latitude: -8.8383, longitude: 13.2344, buyerRadiusKm: 100 });
    const buyer250 = searchWithoutPostgis(records, { latitude: -8.8383, longitude: 13.2344, buyerRadiusKm: 250 });

    for (const row of rows) {
      const hit = buyer10.hits.find((entry) => entry.id === row.id);
      expect(hit?.included).toBe(row.buyer10);
      if (row.buyer10 || hit?.distanceMetres != null) {
        expect(Math.abs((hit?.distanceMetres ?? Number.NaN) - row.distanceMetres)).toBeLessThan(1);
      }
      expect(buyer100.hits.find((entry) => entry.id === row.id)?.included).toBe(row.buyer100);
      expect(buyer250.hits.find((entry) => entry.id === row.id)?.included).toBe(row.buyer250);
    }
    expect(buyer10.hits.find((entry) => entry.id === "missing")?.included).toBe(false);
    expect(buyer10.includedIds.filter((id) => id !== "missing").sort()).toEqual(
      rows.filter((row) => row.buyer10).map((row) => row.id).sort(),
    );
  });

  it("matches coerced invalid coordinates and polygon predicates", () => {
    const coerced = psqlJson<{ latitude: number; longitude: number; distanceMetres: number }>(`
      SELECT json_build_object(
        'latitude', ST_Y(ST_SetSRID(ST_MakePoint(13.2344, 95), 4326)::geography::geometry),
        'longitude', ST_X(ST_SetSRID(ST_MakePoint(13.2344, 95), 4326)::geography::geometry),
        'distanceMetres', ST_Distance(
          ST_SetSRID(ST_MakePoint(13.2344, 95), 4326)::geography,
          ST_SetSRID(ST_MakePoint(13.2344, -8.8383), 4326)::geography
        )
      )
    `);
    const folded = coerceGeographyCoordinate(95, 13.2344);
    expect(folded.latitude).toBe(coerced.latitude);
    expect(folded.longitude).toBe(coerced.longitude);
    const distance = wgs84DistanceMetres(
      { latitude: folded.latitude, longitude: folded.longitude },
      { latitude: -8.8383, longitude: 13.2344 },
    );
    expect(Math.abs(distance - coerced.distanceMetres)).toBeLessThan(1);

    const square = [
      [13.2, -8.9],
      [13.3, -8.9],
      [13.3, -8.8],
      [13.2, -8.8],
      [13.2, -8.9],
    ] as const;
    const relations = psqlJson<{
      insideContains: boolean;
      boundaryContains: boolean;
      boundaryIntersects: boolean;
      edgeOverlaps: boolean;
      edgeIntersects: boolean;
      bowtie: boolean;
    }>(`
      WITH poly AS (
        SELECT ST_GeomFromText('POLYGON((13.20 -8.90, 13.30 -8.90, 13.30 -8.80, 13.20 -8.80, 13.20 -8.90))', 4326) AS g
      ),
      edge AS (
        SELECT ST_GeomFromText('POLYGON((13.30 -8.90, 13.40 -8.90, 13.40 -8.80, 13.30 -8.80, 13.30 -8.90))', 4326) AS g
      )
      SELECT json_build_object(
        'insideContains', ST_Contains((SELECT g FROM poly), ST_SetSRID(ST_MakePoint(13.25, -8.85), 4326)),
        'boundaryContains', ST_Contains((SELECT g FROM poly), ST_SetSRID(ST_MakePoint(13.20, -8.85), 4326)),
        'boundaryIntersects', ST_Intersects((SELECT g FROM poly), ST_SetSRID(ST_MakePoint(13.20, -8.85), 4326)),
        'edgeOverlaps', ST_Overlaps((SELECT g FROM poly), (SELECT g FROM edge)),
        'edgeIntersects', ST_Intersects((SELECT g FROM poly), (SELECT g FROM edge)),
        'bowtie', ST_IsValid(ST_GeomFromText('POLYGON((0 0, 1 1, 0 1, 1 0, 0 0))'))
      )
    `);
    expect(pointPolygonRelation(square, 13.25, -8.85).contains).toBe(relations.insideContains);
    expect(pointPolygonRelation(square, 13.2, -8.85).contains).toBe(relations.boundaryContains);
    expect(pointPolygonRelation(square, 13.2, -8.85).intersects).toBe(relations.boundaryIntersects);
    expect(polygonPolygonRelation(square, [
      [13.3, -8.9],
      [13.4, -8.9],
      [13.4, -8.8],
      [13.3, -8.8],
      [13.3, -8.9],
    ]).overlaps).toBe(relations.edgeOverlaps);
    expect(polygonPolygonRelation(square, [
      [13.3, -8.9],
      [13.4, -8.9],
      [13.4, -8.8],
      [13.3, -8.8],
      [13.3, -8.9],
    ]).intersects).toBe(relations.edgeIntersects);
    expect(relations.bowtie).toBe(false);
  });
});

interface BaselineRow {
  id: string;
  latitude: number;
  longitude: number;
  coverageKm: number;
  distanceMetres: number;
  buyer10: boolean;
  buyer100: boolean;
  buyer250: boolean;
}

function localPostgisAvailable(): boolean {
  try {
    execFileSync(
      "sudo",
      ["-u", "postgres", "psql", "-d", "geospatial_baseline", "-tAc", "SELECT postgis_version()"],
      { stdio: "ignore" },
    );
    return true;
  } catch {
    return false;
  }
}

function psqlJson<T>(sql: string): T {
  const output = execFileSync(
    "sudo",
    ["-u", "postgres", "psql", "-d", "geospatial_baseline", "-v", "ON_ERROR_STOP=1", "-q", "-t", "-A", "-c", sql],
    { encoding: "utf8" },
  );
  return JSON.parse(output) as T;
}
