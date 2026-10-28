import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Applies cloudhike/schema/postgis-free to a local socket database.
 * Refuses hosted URLs. Does not read .env.cloudhike.local. Does not connect to CloudHike.
 */

const DATABASE = "cloudhike_schema_dev";
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const schemaDir = join(root, "cloudhike/schema/postgis-free");

function refuseHostedEnvironment() {
  if (process.argv.includes("--cloudhike")) {
    throw new Error("Refusing to apply the PostGIS-free schema to CloudHike.");
  }
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    const value = process.env[key] ?? "";
    if (/cloudhike|supabase\.co|amazonaws|neon\.tech|sslmode=/i.test(value)) {
      throw new Error(`Refusing to apply schema while ${key} names a hosted database.`);
    }
  }
}

function psql(database, args, input) {
  return execFileSync("sudo", ["-u", "postgres", "psql", "-d", database, "-v", "ON_ERROR_STOP=1", "-X", "-q", ...args], {
    encoding: "utf8",
    input,
    maxBuffer: 32 * 1024 * 1024,
  });
}

function assertLocal(database) {
  const raw = psql(database, ["-t", "-A", "-c", "SELECT current_database() || '|' || (inet_server_addr() IS NULL)"]);
  const [name, local] = raw.trim().split("|");
  if (name !== database || local !== "true") {
    throw new Error(`Refusing to apply schema on database ${name} local=${local}.`);
  }
}

function main() {
  refuseHostedEnvironment();
  assertLocal("postgres");
  psql(
    "postgres",
    ["-c", `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DATABASE}' AND pid <> pg_backend_pid();`],
  );
  execFileSync("sudo", ["-u", "postgres", "dropdb", "--if-exists", DATABASE], { encoding: "utf8" });
  execFileSync("sudo", ["-u", "postgres", "createdb", DATABASE], { encoding: "utf8" });
  assertLocal(DATABASE);

  const files = readdirSync(schemaDir).filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) {
    process.stdout.write(`apply ${file}\n`);
    psql(DATABASE, ["-f", join(schemaDir, file)]);
  }

  const validation = psql(DATABASE, [
    "-t",
    "-A",
    "-c",
    `
    SELECT json_build_object(
      'database', current_database(),
      'local', inet_server_addr() IS NULL,
      'postgis', EXISTS (SELECT 1 FROM pg_extension WHERE extname LIKE 'postgis%'),
      'geography_columns', (
        SELECT count(*) FROM information_schema.columns
        WHERE udt_name IN ('geography', 'geometry')
      ),
      'boundary_type', (
        SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'delivery_zones' AND column_name = 'boundary'
      ),
      'spatial_functions', (
        SELECT count(*) FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN (
            'search_marketplace_products',
            'search_marketplace_services',
            'get_nearby_services',
            'get_nearby_products',
            'get_nearby_agricultural_resources',
            'get_entities_in_bounds'
          )
      ),
      'sync_functions', (
        SELECT count(*) FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('sync_geography_point', 'sync_location_point')
      ),
      'lat_lon_indexes', (
        SELECT count(*) FROM pg_indexes
        WHERE schemaname = 'public' AND indexname LIKE '%lat_lon%'
      ),
      'products', to_regclass('public.products') IS NOT NULL,
      'services', to_regclass('public.services') IS NOT NULL,
      'transport_services', to_regclass('public.transport_services') IS NOT NULL,
      'customer_addresses', to_regclass('public.customer_addresses') IS NOT NULL
    )
    `,
  ]);
  process.stdout.write(`validation ${validation.trim()}\n`);

  const preserved = psql(DATABASE, [
    "-t",
    "-A",
    "-c",
    `
    INSERT INTO public.locations (province_name, latitude, longitude)
    VALUES ('probe', 95, 200)
    RETURNING latitude::text || ',' || longitude::text;
    `,
  ]);
  process.stdout.write(`stored_coordinates ${preserved.trim()}\n`);

  const polygon = psql(DATABASE, [
    "-t",
    "-A",
    "-c",
    `
    INSERT INTO public.delivery_zones (name, boundary)
    VALUES (
      'probe-zone',
      '{"type":"Polygon","coordinates":[[[13.2,-8.9],[13.3,-8.9],[13.3,-8.8],[13.2,-8.8],[13.2,-8.9]]]}'::jsonb
    )
    RETURNING boundary::text;
    `,
  ]);
  process.stdout.write(`stored_boundary ${polygon.trim()}\n`);

  psql(DATABASE, [
    "-c",
    `
    INSERT INTO public.locations (province_name, latitude, longitude)
    SELECT 'bench', -18 + random() * 16, 11 + random() * 13
    FROM generate_series(1, 100000);
    ANALYZE public.locations;
    `,
  ]);
  const explain = psql(DATABASE, [
    "-c",
    `
    EXPLAIN (ANALYZE, FORMAT TEXT)
    SELECT id FROM public.locations
    WHERE latitude BETWEEN -9.290493792219962 AND -8.386106207780038
      AND longitude BETWEEN 12.77930282048618 AND 13.689497179513822;
    `,
  ]);
  process.stdout.write(explain);
  const sequential = psql(DATABASE, [
    "-c",
    `
    BEGIN;
    SET LOCAL enable_indexscan = off;
    SET LOCAL enable_bitmapscan = off;
    EXPLAIN (ANALYZE, FORMAT TEXT)
    SELECT id FROM public.locations
    WHERE latitude BETWEEN -9.290493792219962 AND -8.386106207780038
      AND longitude BETWEEN 12.77930282048618 AND 13.689497179513822;
    ROLLBACK;
    `,
  ]);
  process.stdout.write(sequential);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  if (error && typeof error === "object" && "stderr" in error && error.stderr) {
    process.stderr.write(String(error.stderr));
  }
  if (error && typeof error === "object" && "stdout" in error && error.stdout) {
    process.stderr.write(String(error.stdout));
  }
  process.exit(1);
}
