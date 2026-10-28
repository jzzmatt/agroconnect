import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { destinationDecision } from "./classify-migrations.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function redact(value) {
  return String(value).replace(/postgres(?:ql)?:\/\/\S+/gi, "postgresql://***");
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

function fail(code, message) {
  console.error(message);
  process.exit(code);
}

loadEnvFile(join(root, ".env.cloudhike.local"));

const databaseUrl = process.env.DATABASE_URL?.trim();
const directUrl = process.env.DIRECT_URL?.trim();

if (!databaseUrl || !directUrl) {
  fail(
    1,
    [
      "CloudHike database is not configured.",
      "The migration database is project agroconnect (agroconnect-8shmts), production Postgres. Put its DATABASE_URL and DIRECT_URL in .env.cloudhike.local.",
      "No migration SQL was applied.",
    ].join("\n")
  );
}

if (databaseUrl.startsWith("NEXT_PUBLIC_") || directUrl.includes("NEXT_PUBLIC_")) {
  fail(1, "Refusing CloudHike database URLs that use a NEXT_PUBLIC_ name. No migration SQL was applied.");
}

const connectionString = directUrl;
let Client;
try {
  ({ Client } = await import("pg"));
} catch {
  fail(1, "The pg package is not installed. Run npm install and retry. No migration SQL was applied.");
}

const client = new Client({ connectionString, connectionTimeoutMillis: 10000 });

try {
  await client.connect();
  const result = await client.query(`
    SELECT current_setting('server_version') AS server_version,
           EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'postgis') AS postgis_available,
           (SELECT count(*)::int FROM pg_available_extensions) AS extension_count,
           EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'uuid-ossp') AS uuid_ossp_available,
           to_regprocedure('gen_random_uuid()') IS NOT NULL AS gen_random_uuid,
           (SELECT string_agg(extname, ',' ORDER BY extname) FROM pg_extension) AS installed
  `);
  const row = result.rows[0];
  const decision = destinationDecision({ postgisAvailable: row.postgis_available === true });
  console.log(
    JSON.stringify(
      {
        serverVersion: row.server_version,
        extensionCount: row.extension_count,
        postgisAvailable: row.postgis_available === true,
        uuidOsspAvailable: row.uuid_ossp_available === true,
        genRandomUuid: row.gen_random_uuid === true,
        installedExtensions: row.installed,
        decision: decision.code,
        applySchema: decision.applySchema,
        message: decision.message,
      },
      null,
      2
    )
  );
  process.exitCode = decision.exitCode;
} catch (error) {
  fail(1, `CloudHike Postgres check failed: ${redact(error instanceof Error ? error.message : error)}`);
} finally {
  await client.end().catch(() => undefined);
}
