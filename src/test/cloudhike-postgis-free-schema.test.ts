/**
 * @vitest-environment node
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  codeWithoutComments,
  renderSchema,
  splitSql,
  transformStatement,
} from "../../scripts/cloudhike/render-postgis-free-schema.mjs";

const root = process.cwd();
const schemaDir = join(root, "cloudhike/schema/postgis-free");
const rendered = renderSchema(join(root, "supabase/migrations"));

describe("PostGIS-free schema renderer", () => {
  it("splits dollar-quoted function bodies on their real terminator", () => {
    const parts = splitSql("SELECT 'a;b'; CREATE FUNCTION f() RETURNS int AS $$ BEGIN RETURN 1; END; $$ LANGUAGE sql;");
    expect(parts).toHaveLength(2);
    expect(parts[1]).toContain("RETURN 1;");
  });

  it("removes PostGIS tokens, storage policies, and Supabase role grants", () => {
    const combined = rendered.files.map((file) => codeWithoutComments(file.sql)).join("\n");
    expect(combined).not.toMatch(/\bGEOGRAPHY\s*\(/i);
    expect(combined).not.toMatch(/\bGEOMETRY\s*\(/i);
    expect(combined).not.toMatch(/\bST_[A-Za-z0-9_]+\s*\(/);
    expect(combined).not.toMatch(/::geography|::geometry/i);
    expect(combined).not.toMatch(/\bstorage\.(buckets|objects|foldername)\b/);
    expect(combined).not.toMatch(/\b(GRANT|REVOKE)\b[^;]*\b(anon|authenticated|service_role)\b/i);
    expect(combined).toContain("v_role IN ('authenticated', 'anon')");
    expect(combined).not.toMatch(/uuid_generate_v4\s*\(/i);
    expect(combined).not.toMatch(/\bauth\.(jwt|role)\s*\(/);
    expect(combined).toContain("gen_random_uuid()");
    expect(combined).toContain("sync_geography_point");
    expect(combined).toContain("sync_location_point");
    expect(combined).toContain("boundary JSONB");
    expect(combined).not.toContain("search_marketplace_products");
    expect(combined).not.toContain("get_entities_in_bounds");
    for (const name of [
      "public.products",
      "public.services",
      "public.delivery_zones",
      "public.transport_services",
      "public.customer_addresses",
      "public.locations",
    ]) {
      expect(combined).toContain(name);
    }
    expect(rendered.manifest.dropped.some((item) => item.reason === "spatial_function")).toBe(true);
    expect(rendered.manifest.latLonIndexes).toHaveLength(16);
  });

  it("keeps the public media statements from the mixed storage migration", () => {
    const mixed = rendered.files.find((file) => file.fileName.startsWith("20260923210000"));
    expect(mixed?.sql).toContain("ALTER TABLE");
    expect(mixed?.sql).not.toContain("storage.objects");
  });

  it("matches the committed schema files", () => {
    const committed = readdirSync(schemaDir).filter((name) => name.endsWith(".sql")).sort();
    expect(committed).toEqual(rendered.files.map((file) => file.fileName));
    for (const file of rendered.files) {
      expect(readFileSync(join(schemaDir, file.fileName), "utf8")).toBe(file.sql);
    }
    const manifest = JSON.parse(readFileSync(join(root, "cloudhike/schema/manifest.json"), "utf8"));
    expect(manifest.sourceFiles).toBe(rendered.manifest.sourceFiles);
    expect(manifest.dropped).toHaveLength(rendered.manifest.dropped.length);
  });

  it("replaces both geography trigger functions and rejects a leftover geography column", () => {
    const location = transformStatement(
      "CREATE OR REPLACE FUNCTION public.sync_location_point() RETURNS TRIGGER AS $$ BEGIN NEW.location = ST_MakePoint(1, 2); NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;",
    );
    expect(location.action).toBe("replace");
    expect(location.sql).toContain("NEW.updated_at");
    expect(location.sql).not.toContain("ST_");

    const leftover = transformStatement("ALTER TABLE public.products ADD COLUMN marker GEOGRAPHY(Point, 4326);");
    expect(leftover.action).toBe("reject");
  });
});

const localSchema = localSchemaStatus();

describe.skipIf(!localSchema)("local PostGIS-free schema", () => {
  it("loaded on the isolated socket database", () => {
    expect(localSchema?.database).toBe("cloudhike_schema_dev");
    expect(localSchema?.local).toBe(true);
    expect(localSchema?.postgis).toBe(false);
    expect(localSchema?.geography_columns).toBe(0);
    expect(localSchema?.boundary_type).toBe("jsonb");
    expect(localSchema?.spatial_functions).toBe(0);
    expect(localSchema?.sync_functions).toBe(2);
    expect(localSchema?.lat_lon_indexes).toBe(16);
    expect(localSchema?.products).toBe(true);
    expect(localSchema?.transport_services).toBe(true);
  });
});

function localSchemaStatus(): {
  database: string;
  local: boolean;
  postgis: boolean;
  geography_columns: number;
  boundary_type: string;
  spatial_functions: number;
  sync_functions: number;
  lat_lon_indexes: number;
  products: boolean;
  transport_services: boolean;
} | null {
  try {
    const raw = execFileSync(
      "sudo",
      [
        "-u",
        "postgres",
        "psql",
        "-d",
        "cloudhike_schema_dev",
        "-X",
        "-t",
        "-A",
        "-c",
        `SELECT json_build_object(
          'database', current_database(),
          'local', inet_server_addr() IS NULL,
          'postgis', EXISTS (SELECT 1 FROM pg_extension WHERE extname LIKE 'postgis%'),
          'geography_columns', (SELECT count(*) FROM information_schema.columns WHERE udt_name IN ('geography', 'geometry')),
          'boundary_type', (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'delivery_zones' AND column_name = 'boundary'),
          'spatial_functions', (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname IN ('search_marketplace_products','search_marketplace_services','get_nearby_services','get_nearby_products','get_nearby_agricultural_resources','get_entities_in_bounds')),
          'sync_functions', (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname IN ('sync_geography_point','sync_location_point')),
          'lat_lon_indexes', (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%lat_lon%'),
          'products', to_regclass('public.products') IS NOT NULL,
          'transport_services', to_regclass('public.transport_services') IS NOT NULL
        )`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
