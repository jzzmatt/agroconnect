/**
 * Local performance probe for the PostGIS-free radius prototype.
 * Uses an in-memory catalogue and, when peer auth works, a local Postgres
 * database named geospatial_proto. It never reads CloudHike URLs.
 */
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { conservativeRadiusBounds } from "../../src/lib/geospatial/radius-bounds";
import { searchWithoutPostgis, type RadiusRecord } from "../../src/lib/geospatial/postgis-free-search";
import { wgs84DistanceMetres } from "../../src/lib/geospatial/wgs84-distance";

const LUANDA = { latitude: -8.8383, longitude: 13.2344 };
const SIZES = [1_000, 10_000, 100_000];

function catalogue(count: number): RadiusRecord[] {
  const random = mulberry32(count);
  const records: RadiusRecord[] = [];
  for (let index = 0; index < count; index += 1) {
    records.push({
      id: `p${index}`,
      latitude: -18 + random() * 16,
      longitude: 11 + random() * 13,
      coverageRadiusKm: 50,
    });
  }
  return records;
}

function fullScan(records: readonly RadiusRecord[], buyerRadiusKm: number) {
  const started = performance.now();
  let included = 0;
  for (const record of records) {
    if (record.latitude == null || record.longitude == null) continue;
    const distance = wgs84DistanceMetres(LUANDA, {
      latitude: record.latitude,
      longitude: record.longitude,
    });
    if (distance <= buyerRadiusKm * 1000 || distance <= 50_000) included += 1;
  }
  return { included, elapsedMs: performance.now() - started };
}

function memory() {
  const usage = process.memoryUsage();
  return {
    heapUsedMb: round(usage.heapUsed / 1048576),
    rssMb: round(usage.rss / 1048576),
  };
}

const results = SIZES.map((count) => {
  const records = catalogue(count);
  const before = memory();
  const filtered = searchWithoutPostgis(records, { ...LUANDA, buyerRadiusKm: 50 });
  const scan = fullScan(records, 50);
  return {
    totalRecords: count,
    candidateRecords: filtered.metrics.candidateCount,
    finalMatches: filtered.metrics.includedCount,
    fullScanMatches: scan.included,
    candidateSelectionMs: round(filtered.metrics.candidateSelectionMs),
    exactDistanceMs: round(filtered.metrics.exactDistanceMs),
    filteredTotalMs: round(filtered.metrics.totalMs),
    fullScanMs: round(scan.elapsedMs),
    memoryBefore: before,
    memoryAfter: memory(),
  };
});

let database: unknown = null;
try {
  database = localDatabaseProbe(catalogue(100_000));
} catch (error) {
  database = { available: false, error: error instanceof Error ? error.message : String(error) };
}

console.log(JSON.stringify({ inMemory: results, database }, null, 2));

function localDatabaseProbe(records: readonly RadiusRecord[]) {
  const exists = psql("postgres", "SELECT count(*) FROM pg_database WHERE datname = 'geospatial_proto'");
  if (exists.trim() === "0") {
    execFileSync("sudo", ["-u", "postgres", "createdb", "geospatial_proto"], { encoding: "utf8" });
  }
  const identity = psql(
    "geospatial_proto",
    "SELECT json_build_object('db', current_database(), 'local', inet_server_addr() IS NULL)",
  );
  const parsed = JSON.parse(identity) as { db: string; local: boolean };
  if (parsed.db !== "geospatial_proto" || parsed.local !== true) {
    throw new Error("Refusing to benchmark a database that is not the local geospatial_proto socket.");
  }
  psql("geospatial_proto", "DROP TABLE IF EXISTS proto_places");
  psql(
    "geospatial_proto",
    `CREATE TABLE proto_places (
      id text PRIMARY KEY,
      latitude double precision NOT NULL,
      longitude double precision NOT NULL,
      coverage_radius_km double precision NOT NULL
    )`,
  );
  psql(
    "geospatial_proto",
    "CREATE INDEX proto_places_lat_lon_idx ON proto_places (latitude, longitude)",
  );
  const directory = mkdtempSync(join(tmpdir(), "geospatial-proto-"));
  chmodSync(directory, 0o755);
  const csvPath = join(directory, "places.csv");
  writeFileSync(
    csvPath,
    records
      .map((record) => `${record.id},${record.latitude},${record.longitude},${record.coverageRadiusKm}`)
      .join("\n"),
  );
  chmodSync(csvPath, 0o644);
  execFileSync(
    "sudo",
    ["-u", "postgres", "psql", "-d", "geospatial_proto", "-v", "ON_ERROR_STOP=1", "-c",
      `\\copy proto_places (id, latitude, longitude, coverage_radius_km) FROM '${csvPath}' WITH (FORMAT csv)`],
    { encoding: "utf8" },
  );
  psql("geospatial_proto", "ANALYZE proto_places");
  const filtered = searchWithoutPostgis(records, { ...LUANDA, buyerRadiusKm: 50 });
  const bounds = conservativeRadiusBounds(LUANDA, filtered.prefilterRadiusMetres ?? 50_000);
  if (bounds.longitudeRanges === "all") {
    throw new Error("Luanda 50 km bounds unexpectedly covered every longitude.");
  }
  const longitude = bounds.longitudeRanges[0];
  if (!longitude) throw new Error("Missing longitude range.");
  const predicate = `latitude BETWEEN ${bounds.latitudeMin} AND ${bounds.latitudeMax} AND longitude BETWEEN ${longitude.min} AND ${longitude.max}`;
  const indexedPlan = psql(
    "geospatial_proto",
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT count(*) FROM proto_places WHERE ${predicate}`,
  );
  const sequentialPlan = psql(
    "geospatial_proto",
    `BEGIN;
     SET LOCAL enable_indexscan = off;
     SET LOCAL enable_bitmapscan = off;
     EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT count(*) FROM proto_places WHERE ${predicate};
     ROLLBACK;`,
  );
  psql("geospatial_proto", "CREATE EXTENSION IF NOT EXISTS cube");
  psql("geospatial_proto", "CREATE EXTENSION IF NOT EXISTS earthdistance");
  const spherePlan = psql(
    "geospatial_proto",
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
     SELECT count(*) FROM proto_places
     WHERE earth_box(ll_to_earth(${LUANDA.latitude}, ${LUANDA.longitude}), 50000) @> ll_to_earth(latitude, longitude)`,
  );
  const includedPath = join(directory, "included.csv");
  writeFileSync(includedPath, `${filtered.includedIds.join("\n")}\n`);
  chmodSync(includedPath, 0o644);
  psql("geospatial_proto", "CREATE TABLE IF NOT EXISTS proto_included_ids (id text)");
  psql("geospatial_proto", "TRUNCATE proto_included_ids");
  execFileSync(
    "sudo",
    ["-u", "postgres", "psql", "-d", "geospatial_proto", "-v", "ON_ERROR_STOP=1", "-c",
      `\\copy proto_included_ids (id) FROM '${includedPath}' WITH (FORMAT csv)`],
    { encoding: "utf8" },
  );
  const falseNegatives = psql(
    "geospatial_proto",
    `SELECT count(*) FROM proto_places p
     JOIN proto_included_ids i ON i.id = p.id
     WHERE NOT (earth_box(ll_to_earth(${LUANDA.latitude}, ${LUANDA.longitude}), 50000) @> ll_to_earth(p.latitude, p.longitude))`,
  );
  const sampleDistance = psql(
    "geospatial_proto",
    "SELECT earth_distance(ll_to_earth(0, 0), ll_to_earth(0, 1))",
  );
  return {
    available: true,
    identity: parsed,
    indexedPlan,
    sequentialPlan,
    spherePlan,
    earthDistanceOneDegreeMetres: Number(sampleDistance),
    sphereFalseNegativesAt50km: Number(falseNegatives),
    indexedCandidateNote: "The indexed predicate is conservativeRadiusBounds for the 50 km prefilter radius.",
  };
}

function psql(database: string, sql: string): string {
  return execFileSync(
    "sudo",
    ["-u", "postgres", "psql", "-d", database, "-v", "ON_ERROR_STOP=1", "-q", "-t", "-A", "-c", sql],
    { encoding: "utf8" },
  ).trim();
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
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
