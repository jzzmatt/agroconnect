import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { pageMarketplaceCatalogue, type CatalogueRecord } from "../../src/lib/geospatial/catalogue-page";
import { searchWithoutPostgis } from "../../src/lib/geospatial/postgis-free-search";
import { conservativeRadiusBounds } from "../../src/lib/geospatial/radius-bounds";
import { wgs84Direct } from "../../src/lib/geospatial/wgs84-distance";

/**
 * Rolled-back capability probe for the existing CloudHike production database.
 * Uses temporary tables with ON COMMIT DROP and always rolls back.
 * Does not print the connection string. Refuses a local socket or a non-empty public schema.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const LUANDA = { latitude: -8.8383, longitude: 13.2344 };

function redact(value: unknown): string {
  return String(value).replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://***");
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") process.env[key] = value;
  }
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

loadEnvFile(join(root, ".env.cloudhike.local"));
const directUrl = process.env.DIRECT_URL?.trim() ?? "";
if (!directUrl) fail("DIRECT_URL is missing. No SQL was applied.");
if (/supabase\.co|localhost|127\.0\.0\.1|cloudhike_schema_dev/i.test(directUrl)) {
  fail("Refusing a non-CloudHike connection target. No SQL was applied.");
}

const { Client } = pg;
const client = new Client({ connectionString: directUrl, connectionTimeoutMillis: 15000, statement_timeout: 8000 });

function publicRelationsSql() {
  return `
    SELECT count(*)::int AS relations
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','S','f')
  `;
}

async function main() {
  await client.connect();
  const identity = await client.query<{
    database: string;
    remote: boolean;
    owner: boolean;
    statement_timeout: string;
    relations: number;
  }>(`
    SELECT current_database() AS database,
           inet_server_addr() IS NOT NULL AS remote,
           (SELECT datdba = (SELECT oid FROM pg_roles WHERE rolname = current_user)
              FROM pg_database WHERE datname = current_database()) AS owner,
           current_setting('statement_timeout') AS statement_timeout,
           (${publicRelationsSql()}) AS relations
  `);
  const who = identity.rows[0];
  if (!who?.remote) fail("Refusing a local socket. No SQL was applied.");
  if (!who.owner) fail("Connected role is not the database owner. No SQL was applied.");
  if (who.relations !== 0) fail(`Public schema has ${who.relations} relations. No SQL was applied.`);

  let opened = false;
  try {
    await client.query("BEGIN");
    opened = true;
    const probe = await runProbe();
    process.stdout.write(
      `${JSON.stringify(
        {
          database: who.database,
          remote: who.remote,
          owner: who.owner,
          statementTimeout: who.statement_timeout,
          publicRelationsBefore: who.relations,
          probe,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    if (opened) await client.query("ROLLBACK").catch(() => undefined);
  }

  const after = await client.query<{ relations: number }>(publicRelationsSql());
  if (after.rows[0]?.relations !== 0) {
    fail(`Public schema changed to ${after.rows[0]?.relations} relations after rollback.`);
  }
  process.stdout.write(`${JSON.stringify({ publicRelationsAfter: after.rows[0]?.relations, rolledBack: true })}\n`);
}

async function runProbe() {
  await client.query(`
    CREATE TEMP TABLE phase14_places (
      id text PRIMARY KEY,
      latitude numeric(10,7),
      longitude numeric(10,7),
      price numeric,
      title text,
      description text,
      seller_name text,
      created_at timestamptz
    ) ON COMMIT DROP
  `);
  await client.query("CREATE INDEX phase14_lat_lon ON phase14_places (latitude, longitude)");

  const records = fixtureRecords();
  await client.query(
    `
    INSERT INTO phase14_places (id, latitude, longitude, price, title, description, seller_name, created_at)
    SELECT * FROM unnest(
      $1::text[], $2::numeric[], $3::numeric[], $4::numeric[], $5::text[], $6::text[], $7::text[], $8::timestamptz[]
    )
    `,
    [
      records.map((record) => record.id),
      records.map((record) => record.latitude),
      records.map((record) => record.longitude),
      records.map((record) => record.price),
      records.map((record) => record.title),
      records.map((record) => record.description),
      records.map((record) => record.sellerName),
      records.map((record) => record.createdAt),
    ],
  );
  await client.query("ANALYZE phase14_places");

  const bounds = conservativeRadiusBounds(LUANDA, 50_000);
  const longitudeSql =
    bounds.longitudeRanges === "all"
      ? "TRUE"
      : bounds.longitudeRanges.map((range) => `(longitude >= ${range.min} AND longitude <= ${range.max})`).join(" OR ");
  const candidate = await client.query<{ id: string }>(
    `SELECT id FROM phase14_places WHERE latitude BETWEEN $1 AND $2 AND (${longitudeSql})`,
    [bounds.latitudeMin, bounds.latitudeMax],
  );
  const explain = await client.query<Record<string, string>>(`
    EXPLAIN (ANALYZE, FORMAT TEXT)
    SELECT id FROM phase14_places
    WHERE latitude BETWEEN ${bounds.latitudeMin} AND ${bounds.latitudeMax}
      AND (${longitudeSql})
  `);

  const stored = await client.query<{ id: string; latitude: number | null; longitude: number | null }>(
    "SELECT id, latitude::float8 AS latitude, longitude::float8 AS longitude FROM phase14_places",
  );
  const search = searchWithoutPostgis(
    stored.rows.map((row) => ({
      id: row.id,
      latitude: row.latitude,
      longitude: row.longitude,
      coverageRadiusKm: 50,
    })),
    { ...LUANDA, buyerRadiusKm: 50 },
  );
  const candidateIds = new Set(candidate.rows.map((row) => row.id));
  const missing = search.includedIds.filter((id) => !candidateIds.has(id));

  const text = await client.query<{
    fts: boolean;
    ilike: boolean;
    predicate: boolean;
    matched_id: string | null;
  }>(`
    SELECT
      to_tsvector('portuguese', title) @@ plainto_tsquery('portuguese', 'pão') AS fts,
      title ILIKE '%pão%' AS ilike,
      (
        to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(seller_name, ''))
        @@ plainto_tsquery('portuguese', 'pão')
        OR title ILIKE '%pão%'
        OR description ILIKE '%pão%'
        OR seller_name ILIKE '%pão%'
      ) AS predicate,
      id AS matched_id
    FROM phase14_places
    WHERE id = 'text-bread'
  `);

  const ordered = await client.query<{ id: string }>(`
    SELECT id FROM phase14_places
    WHERE id IN ('cheap', 'mid', 'dear', 'blank')
    ORDER BY price ASC NULLS LAST, id ASC
    LIMIT 2 OFFSET 1
  `);
  const page = pageMarketplaceCatalogue(
    records
      .filter((record) => ["cheap", "mid", "dear", "blank"].includes(record.id))
      .map((record) => ({
        id: record.id,
        latitude: record.latitude,
        longitude: record.longitude,
        coverageRadiusKm: 50,
        price: record.price,
        createdAt: record.createdAt,
        isFeatured: false,
      })) satisfies CatalogueRecord[],
    { latitude: null, longitude: null, buyerRadiusKm: null, sortBy: "price_asc", limit: 2, offset: 1 },
  );

  await client.query(`
    CREATE TEMP TABLE phase14_rls (id int PRIMARY KEY, secret text) ON COMMIT DROP
  `);
  await client.query("ALTER TABLE phase14_rls ENABLE ROW LEVEL SECURITY");
  await client.query("CREATE POLICY phase14_deny ON phase14_rls FOR SELECT USING (false)");
  await client.query("INSERT INTO phase14_rls VALUES (1, 'probe')");
  const ownerBypass = await client.query<{ count: string }>("SELECT count(*)::text AS count FROM phase14_rls");
  await client.query("ALTER TABLE phase14_rls FORCE ROW LEVEL SECURITY");
  const forced = await client.query<{ count: string }>("SELECT count(*)::text AS count FROM phase14_rls");

  const rawCoordinate = await client.query<{ latitude: string; longitude: string; boundary: unknown }>(`
    INSERT INTO phase14_places (id, latitude, longitude, title)
    VALUES (
      'raw-coordinate',
      95,
      200,
      'raw'
    )
    RETURNING latitude::text, longitude::text, NULL::jsonb AS boundary
  `);
  const polygon = await client.query<{ boundary: { coordinates: number[][][] } }>(`
    SELECT '{"type":"Polygon","coordinates":[[[13.2,-8.9],[13.3,-8.9],[13.3,-8.8],[13.2,-8.8],[13.2,-8.9]]]}'::jsonb AS boundary
  `);

  return {
    rows: records.length,
    candidateCount: candidate.rowCount,
    includedCount: search.includedIds.length,
    candidateFalseNegatives: missing,
    explain: explain.rows.map((row) => Object.values(row)[0]).join("\n"),
    text: text.rows[0] ?? null,
    sqlPage: ordered.rows.map((row) => row.id),
    appPage: page.rows.map((row) => row.id),
    ownerSeesDeniedRow: ownerBypass.rows[0]?.count === "1",
    forceRlsHidesDeniedRow: forced.rows[0]?.count === "0",
    rawCoordinate: rawCoordinate.rows[0] ?? null,
    polygonCoordinates: polygon.rows[0]?.boundary.coordinates,
  };
}

function fixtureRecords() {
  const placed = (id: string, metres: number, price: number | null, title: string) => {
    const coordinate = metres === 0 ? LUANDA : wgs84Direct(LUANDA, 0, metres);
    return {
      id,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      price,
      title,
      description: "",
      sellerName: "Agro",
      createdAt: "2026-01-01T00:00:00Z",
    };
  };
  const rows = [
    placed("luanda", 0, 10, "Luanda"),
    placed("n_10", 10_000, 10, "Perto"),
    placed("n_49_9", 49_900, 10, "Quase"),
    placed("n_50", 50_000, 10, "Limite"),
    placed("n_50_1", 50_100, 10, "Fora"),
    placed("n_80", 80_000, 10, "Longe"),
    placed("cheap", 1_000, 5, "Barato"),
    placed("mid", 1_000, 15, "Medio"),
    placed("dear", 1_000, 40, "Caro"),
    placed("blank", 1_000, null, "Sem preco"),
    {
      id: "text-bread",
      ...LUANDA,
      price: 12,
      title: "pães frescos",
      description: "padaria",
      sellerName: "Campo",
      createdAt: "2026-01-02T00:00:00Z",
    },
  ];
  let state = 42;
  for (let index = 0; index < 2000; index += 1) {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    const unit = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    rows.push({
      id: `r${index}`,
      latitude: -18 + unit * 16,
      longitude: 11 + ((unit * 13) % 13),
      price: 20,
      title: "milho",
      description: "",
      sellerName: "Campo",
      createdAt: "2026-01-03T00:00:00Z",
    });
  }
  return rows;
}

main()
  .catch((error) => {
    process.stderr.write(`${redact(error instanceof Error ? error.stack ?? error.message : error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => undefined);
  });
