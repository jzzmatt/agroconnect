import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Renders a PostGIS-free copy of supabase/migrations.
 * This module never opens a connection and never reads CloudHike environment files.
 * Historical files under supabase/migrations are not modified.
 */

const JWT_SQL = "(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb)";
const ROLE_SQL = `(${JWT_SQL}->>'role')`;

const SPATIAL_FUNCTIONS = [
  "search_marketplace_products",
  "search_marketplace_services",
  "get_nearby_services",
  "get_nearby_products",
  "get_nearby_agricultural_resources",
  "get_entities_in_bounds",
];

const LAT_LON_INDEXES = [
  ["locations", "latitude", "longitude", "idx_locations_lat_lon"],
  ["countries", "latitude", "longitude", "idx_countries_lat_lon"],
  ["provinces", "latitude", "longitude", "idx_provinces_lat_lon"],
  ["municipalities", "latitude", "longitude", "idx_municipalities_lat_lon"],
  ["communes", "latitude", "longitude", "idx_communes_lat_lon"],
  ["localities", "latitude", "longitude", "idx_localities_lat_lon"],
  ["profile_locations", "latitude", "longitude", "idx_profile_locations_lat_lon"],
  ["provider_profiles", "latitude", "longitude", "idx_provider_profiles_lat_lon"],
  ["services", "latitude", "longitude", "idx_services_lat_lon"],
  ["products", "latitude", "longitude", "idx_products_lat_lon"],
  ["agricultural_resources", "latitude", "longitude", "idx_agricultural_resources_lat_lon"],
  ["service_requests", "latitude", "longitude", "idx_service_requests_lat_lon"],
  ["customer_addresses", "latitude", "longitude", "idx_customer_addresses_lat_lon"],
  ["transport_services", "origin_latitude", "origin_longitude", "idx_transport_services_origin_lat_lon"],
  ["transport_services", "destination_latitude", "destination_longitude", "idx_transport_services_destination_lat_lon"],
  ["transport_services", "base_latitude", "base_longitude", "idx_transport_services_base_lat_lon"],
];

const SYNC_LOCATION = `CREATE OR REPLACE FUNCTION public.sync_location_point()
RETURNS TRIGGER AS $$
BEGIN
  -- PostGIS-free: latitude and longitude are the stored WGS84 coordinates.
  -- The removed geography column is not maintained. updated_at still advances.
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

const SYNC_GEOGRAPHY = `CREATE OR REPLACE FUNCTION public.sync_geography_point()
RETURNS TRIGGER AS $$
BEGIN
  -- PostGIS-free no-op. Latitude and longitude are already the stored coordinates.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

const POSTGIS_TOKEN =
  /\b(GEOGRAPHY|GEOMETRY)\s*\(|\bST_[A-Za-z0-9_]+\s*\(|::geography\b|::geometry\b/i;

export function splitSql(sql) {
  const statements = [];
  let current = "";
  let i = 0;
  let dollar = null;
  while (i < sql.length) {
    if (!dollar && sql.startsWith("--", i)) {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end + 1;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (!dollar && sql.startsWith("/*", i)) {
      const end = sql.indexOf("*/", i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }
    if (!dollar && sql[i] === "'") {
      current += sql[i++];
      while (i < sql.length) {
        current += sql[i];
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            current += sql[i + 1];
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (!dollar && sql[i] === "$") {
      const match = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (match) {
        dollar = match[0];
        current += dollar;
        i += dollar.length;
        continue;
      }
    }
    if (dollar && sql.startsWith(dollar, i)) {
      current += dollar;
      i += dollar.length;
      dollar = null;
      continue;
    }
    if (!dollar && sql[i] === ";") {
      current += ";";
      statements.push(current);
      current = "";
      i += 1;
      continue;
    }
    current += sql[i];
    i += 1;
  }
  if (current.trim()) statements.push(current);
  return statements;
}

export function codeWithoutComments(sql) {
  let out = "";
  let i = 0;
  let dollar = null;
  while (i < sql.length) {
    if (dollar) {
      if (sql.startsWith(dollar, i)) {
        out += dollar;
        i += dollar.length;
        dollar = null;
        continue;
      }
      out += sql[i++];
      continue;
    }
    if (sql.startsWith("--", i)) {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end + 1;
      out += "\n";
      continue;
    }
    if (sql.startsWith("/*", i)) {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      out += " ";
      continue;
    }
    if (sql[i] === "'") {
      out += sql[i++];
      while (i < sql.length) {
        out += sql[i];
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            out += sql[i + 1];
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (sql[i] === "$") {
      const match = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (match) {
        dollar = match[0];
        out += dollar;
        i += dollar.length;
        continue;
      }
    }
    out += sql[i++];
  }
  return out;
}

function meaningful(sql) {
  return codeWithoutComments(sql).replace(/;/g, "").trim().length > 0;
}

function stripSpatialColumns(sql) {
  const withoutPoints = sql.replace(
    /^[ \t]*(?:location|origin_location|destination_location|base_location)[ \t]+GEOGRAPHY\s*\([^)]*\)[ \t]*,?[ \t]*(?:\r?\n|$)/gim,
    "",
  );
  return withoutPoints.replace(
    /^([ \t]*)boundary[ \t]+GEOMETRY\s*\([^)]*\)/gim,
    "$1boundary JSONB",
  );
}

function referencesSpatialFunction(code) {
  return SPATIAL_FUNCTIONS.some((name) => new RegExp(`\\b${name}\\b`, "i").test(code));
}

export function transformStatement(statement) {
  if (!meaningful(statement)) return { action: "skip", reason: "empty" };
  const code = codeWithoutComments(statement);
  if (/CREATE\s+EXTENSION\b/i.test(code) && /postgis|uuid-ossp/i.test(code)) {
    return { action: "drop", reason: "extension" };
  }
  if (/\bstorage\.(buckets|objects|foldername)\b/i.test(code)) {
    return { action: "drop", reason: "storage" };
  }
  if (/\b(GRANT|REVOKE)\b/i.test(code) && /\b(anon|authenticated|service_role)\b/.test(code)) {
    return { action: "drop", reason: "supabase_role" };
  }
  if (/^\s*CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(code) && /\bUSING\s+GIST\b/i.test(code)) {
    return { action: "drop", reason: "gist_index" };
  }
  if (
    /\b(GRANT|REVOKE|ALTER\s+FUNCTION|DROP\s+FUNCTION)\b/i.test(code) &&
    referencesSpatialFunction(code)
  ) {
    return { action: "drop", reason: "spatial_function_privilege" };
  }
  if (/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\.sync_location_point\s*\(/i.test(code)) {
    return { action: "replace", reason: "sync_location_point", sql: `${SYNC_LOCATION}\n` };
  }
  if (/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\.sync_geography_point\s*\(/i.test(code)) {
    return { action: "replace", reason: "sync_geography_point", sql: `${SYNC_GEOGRAPHY}\n` };
  }

  let next = stripSpatialColumns(statement);
  next = next.replace(/\buuid_generate_v4\s*\(\s*\)/gi, "gen_random_uuid()");
  next = next.replace(/\bauth\.role\s*\(\s*\)/gi, ROLE_SQL);
  next = next.replace(/\bauth\.jwt\s*\(\s*\)/gi, JWT_SQL);
  const nextCode = codeWithoutComments(next);
  if (POSTGIS_TOKEN.test(nextCode)) {
    if (/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\b/i.test(nextCode)) {
      const name = /FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(/i.exec(nextCode);
      return {
        action: "drop",
        reason: "spatial_function",
        name: name ? name[1] : null,
      };
    }
    return { action: "reject", reason: "unresolved_postgis", sql: next };
  }
  return { action: "keep", sql: next };
}

export function renderMigration(fileName, sql) {
  const dropped = [];
  const kept = [];
  for (const statement of splitSql(sql)) {
    const result = transformStatement(statement);
    if (result.action === "reject") {
      throw new Error(`${fileName} still contains PostGIS after conversion: ${statement.slice(0, 180)}`);
    }
    if (result.action === "drop" || result.action === "replace") {
      dropped.push({
        reason: result.reason,
        name: result.name ?? null,
        preview: codeWithoutComments(statement).replace(/\s+/g, " ").trim().slice(0, 160),
      });
    }
    if (result.action === "keep" || result.action === "replace") kept.push(result.sql.trimEnd());
  }
  const header = `-- Generated by scripts/cloudhike/render-postgis-free-schema.mjs
-- Source: supabase/migrations/${fileName}
-- Do not apply to Supabase. Do not apply to CloudHike production.
-- CloudHike has no development database for this phase, so this file was not executed there.
`;
  const body = kept.length > 0 ? `${kept.join("\n\n")}\n` : "-- No statements remained after removing PostGIS, storage policies, or Supabase role grants.\n";
  return { sql: `${header}\n${body}`, dropped };
}

export function latLonIndexSql() {
  const indexes = LAT_LON_INDEXES.map(
    ([table, latitude, longitude, name]) =>
      `CREATE INDEX IF NOT EXISTS ${name} ON public.${table} (${latitude}, ${longitude});`,
  ).join("\n");
  return `-- Generated by scripts/cloudhike/render-postgis-free-schema.mjs
-- Btree candidate filters for the former GEOGRAPHY(Point, 4326) columns.
-- Inclusion is not decided by these indexes. GeographicLib decides distance.
-- No latitude/longitude CHECK is added. A range CHECK would reject numbers that
-- the geography cast currently accepts and folds. Raw numeric values stay stored.

${indexes}

COMMENT ON COLUMN public.delivery_zones.boundary IS
  'GeoJSON Polygon or MultiPolygon, WGS84 longitude/latitude, RFC 7946. Nullable. Coordinates are stored unchanged. contains excludes the boundary and intersects includes it, matching the measured planar polygon semantics. The application validates the ring; this column has no polygon CHECK.';
`;
}

export function forceRowLevelSecuritySql(files) {
  const tables = [];
  const seen = new Set();
  const pattern = /ALTER TABLE (public\.[a-z0-9_]+) ENABLE ROW LEVEL SECURITY\s*;/gi;
  for (const file of files) {
    for (const match of file.sql.matchAll(pattern)) {
      if (seen.has(match[1])) continue;
      seen.add(match[1]);
      tables.push(match[1]);
    }
  }
  const statements = tables.map((table) => `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`).join("\n");
  return `-- Generated by scripts/cloudhike/render-postgis-free-schema.mjs
-- Force row level security on every table that enables it.
-- A table owner bypasses policies until this clause is set.
-- Superusers and roles with BYPASSRLS still bypass row level security.
-- Not applied to CloudHike production in Phase 1.5.

${statements}
`;
}

export function marketplaceCandidateViewsSql() {
  return `-- Generated by scripts/cloudhike/render-postgis-free-schema.mjs
-- Column contracts for the CloudHike marketplace candidate queries.
-- security_invoker keeps the underlying table policies in force.
-- The application query still applies the RPC status and text predicates.
-- Not applied to CloudHike production in Phase 1.5.

CREATE OR REPLACE VIEW public.marketplace_product_candidates
WITH (security_invoker = true) AS
SELECT
  p.id::text AS id,
  p.title,
  p.description,
  pp.business_name AS seller_name,
  p.status,
  pp.status AS seller_status,
  p.category_id,
  p.province_id,
  p.municipality_id,
  p.availability_status,
  p.price,
  p.latitude,
  p.longitude,
  p.selling_radius_km,
  p.is_featured,
  p.created_at
FROM public.products p
JOIN public.provider_profiles pp ON pp.id = p.seller_id;

CREATE OR REPLACE VIEW public.marketplace_service_candidates
WITH (security_invoker = true) AS
SELECT
  s.id::text AS id,
  s.title,
  s.short_description,
  s.description,
  pp.business_name AS provider_name,
  s.status,
  pp.status AS provider_status,
  s.category_id,
  s.province_id,
  s.municipality_id,
  s.pricing_type,
  s.price,
  s.latitude,
  s.longitude,
  s.service_radius_km,
  s.is_featured,
  s.created_at,
  pp.rating AS provider_rating
FROM public.services s
JOIN public.provider_profiles pp ON pp.id = s.provider_id;
`;
}

export function renderSchema(migrationsDir) {
  const fileNames = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const files = [];
  const dropped = [];
  for (const fileName of fileNames) {
    const rendered = renderMigration(fileName, readFileSync(join(migrationsDir, fileName), "utf8"));
    files.push({ fileName, sql: rendered.sql });
    for (const item of rendered.dropped) dropped.push({ file: fileName, ...item });
  }
  files.push({ fileName: "900_lat_lon_indexes.sql", sql: latLonIndexSql() });
  files.push({ fileName: "901_force_row_level_security.sql", sql: forceRowLevelSecuritySql(files) });
  files.push({ fileName: "902_marketplace_candidate_views.sql", sql: marketplaceCandidateViewsSql() });
  return {
    files,
    manifest: {
      sourceDirectory: "supabase/migrations",
      sourceFiles: fileNames.length,
      outputFiles: files.length,
      dropped,
      spatialFunctionsRemoved: SPATIAL_FUNCTIONS,
      latLonIndexes: LAT_LON_INDEXES.map(([table, latitude, longitude, name]) => ({
        table,
        columns: [latitude, longitude],
        name,
      })),
      differences: [
        "CREATE EXTENSION postgis and CREATE EXTENSION uuid-ossp are omitted.",
        "uuid_generate_v4() is replaced with gen_random_uuid(), which PostgreSQL 16 provides in core.",
        "GEOGRAPHY(Point, 4326) columns are omitted. Existing numeric latitude and longitude columns remain nullable and unchecked.",
        "GiST indexes on geography and geometry are omitted. btree (latitude, longitude) indexes are added for candidate filtering.",
        "delivery_zones.boundary is JSONB GeoJSON instead of geometry(Polygon, 4326). The column name is unchanged. Coordinates are not simplified.",
        "sync_geography_point returns NEW without writing a geography value. sync_location_point still sets updated_at.",
        "Spatial RPCs are omitted. Radius inclusion, ordering, and pagination are application functions and are not installed as SQL.",
        "Statements against storage.buckets and storage.objects are omitted. Public-table statements in the same source file are kept.",
        "GRANT and REVOKE targeting anon, authenticated, or service_role are omitted.",
        "auth.jwt() and auth.role() are rewritten to current_setting('request.jwt.claims', true). CloudHike does not set that value. This is not an authentication migration.",
        "NOTIFY pgrst statements are unchanged. They do not require PostgREST to be present.",
        "901_force_row_level_security.sql forces row level security on every table that enables it. It does not replace permissive policies.",
        "902_marketplace_candidate_views.sql adds security-invoker views for the application candidate queries. Those queries are not installed as SQL functions.",
      ],
    },
  };
}

function writeSchema(root) {
  const migrationsDir = join(root, "supabase/migrations");
  const outDir = join(root, "cloudhike/schema/postgis-free");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const rendered = renderSchema(migrationsDir);
  for (const file of rendered.files) {
    writeFileSync(join(outDir, file.fileName), file.sql);
  }
  writeFileSync(join(root, "cloudhike/schema/manifest.json"), `${JSON.stringify(rendered.manifest, null, 2)}\n`);
  return rendered.manifest;
}

const executedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (executedDirectly) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
  const manifest = writeSchema(root);
  process.stdout.write(
    `Wrote ${manifest.outputFiles} PostGIS-free files. Dropped ${manifest.dropped.length} statements.\n`,
  );
}
