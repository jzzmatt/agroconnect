import { describe, expect, it } from "vitest";
import { join } from "node:path";
import {
  classifySql,
  destinationDecision,
  loadSqlFiles,
  summarize,
} from "../../scripts/cloudhike/classify-migrations.mjs";

const migrationsDir = join(process.cwd(), "supabase/migrations");

describe("CloudHike migration inventory", () => {
  const files = loadSqlFiles(migrationsDir);

  it("flags PostGIS, Supabase storage, and Clerk JWT dependencies", () => {
    const byName = new Map(files.map((file) => [file.file, file.tags]));
    expect(byName.get("20260821000001_phase1_foundation.sql")).toContain("postgis");
    expect(byName.get("20260821000012_010_postgis_location_functions.sql")).toContain("postgis");
    expect(byName.get("20260822000014_024_product_image_storage.sql")).toContain("supabase_storage");
    expect(byName.get("20260821000009_007_row_level_security.sql")).toEqual(
      expect.arrayContaining(["supabase_auth", "rls", "clerk_identity"])
    );
    expect(byName.get("20260827000003_038_phase10_transport.sql")).toEqual(
      expect.arrayContaining(["postgis", "supabase_auth"])
    );
  });

  it("finds spatial SQL and leaves a plain column change untagged", () => {
    expect(classifySql("CREATE EXTENSION IF NOT EXISTS \"postgis\";")).toContain("postgis");
    expect(classifySql("ALTER TABLE public.profiles ADD COLUMN theme_preference TEXT;")).toEqual([]);
    const summary = summarize(files);
    expect(summary.files).toBeGreaterThan(50);
    expect(summary.postgis).toBeGreaterThan(5);
    expect(summary.supabase_storage).toBeGreaterThan(0);
    expect(summary.untagged).toBeGreaterThan(0);
  });

  it("refuses to apply schema while PostGIS is missing", () => {
    const blocked = destinationDecision({ postgisAvailable: false });
    expect(blocked.applySchema).toBe(false);
    expect(blocked.exitCode).toBe(2);
    expect(blocked.code).toBe("POSTGIS_UNSUPPORTED");

    const present = destinationDecision({ postgisAvailable: true });
    expect(present.applySchema).toBe(false);
    expect(present.exitCode).toBe(0);
  });
});
