import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Classifies existing SQL files for a future CloudHike replay.
 * This module never opens a connection and never executes SQL.
 */

export const TAGS = [
  {
    id: "postgis",
    re: /CREATE\s+EXTENSION[^;]*postgis|GEOGRAPHY\s*\(|GEOMETRY\s*\(|\bST_[A-Za-z0-9_]+\s*\(|::geography|::geometry/i,
  },
  {
    id: "supabase_storage",
    re: /\bstorage\.(buckets|objects)\b/i,
  },
  {
    id: "supabase_auth",
    re: /\bauth\.(jwt|uid|role)\s*\(|request\.jwt/i,
  },
  {
    id: "supabase_roles",
    re: /\b(anon|authenticated|service_role)\b/,
  },
  {
    id: "rls",
    re: /ROW LEVEL SECURITY|CREATE POLICY/i,
  },
  {
    id: "clerk_identity",
    re: /clerk_user_id|current_clerk_user_id/,
  },
];

export function classifySql(sql) {
  return TAGS.filter((tag) => tag.re.test(sql)).map((tag) => tag.id);
}

export function loadSqlFiles(directory) {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((file) => {
      const sql = readFileSync(join(directory, file), "utf8");
      return { file, tags: classifySql(sql) };
    });
}

export function summarize(files) {
  const summary = {
    files: files.length,
    untagged: 0,
    postgis: 0,
    supabase_storage: 0,
    supabase_auth: 0,
    supabase_roles: 0,
    rls: 0,
    clerk_identity: 0,
  };
  for (const file of files) {
    if (file.tags.length === 0) summary.untagged += 1;
    for (const tag of file.tags) summary[tag] += 1;
  }
  return summary;
}

/**
 * Phase 1 never applies schema. PostGIS absence is a hard stop.
 * PostGIS presence still requires a separate, explicit apply step.
 */
export function destinationDecision(probe) {
  if (!probe?.postgisAvailable) {
    return {
      applySchema: false,
      exitCode: 2,
      code: "POSTGIS_UNSUPPORTED",
      message:
        "PostGIS is not available on this CloudHike Postgres. Spatial columns, GiST indexes, and ST_ functions were not changed and no migration SQL was applied.",
    };
  }
  return {
    applySchema: false,
    exitCode: 0,
    code: "POSTGIS_PRESENT_APPLY_NOT_RUN",
    message:
      "PostGIS is available. Phase 1 does not apply migrations automatically. Review docs/cloudhike/migration-runbook.md before any replay.",
  };
}
