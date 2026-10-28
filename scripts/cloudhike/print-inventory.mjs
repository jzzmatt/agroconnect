import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSqlFiles, summarize } from "./classify-migrations.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migrations = loadSqlFiles(join(root, "supabase/migrations"));
const seeds = loadSqlFiles(join(root, "supabase/seed/angola"));

console.log(
  JSON.stringify(
    {
      migrations: summarize(migrations),
      seeds: summarize(seeds),
      postgisFiles: migrations.filter((file) => file.tags.includes("postgis")).map((file) => file.file),
      storageFiles: migrations.filter((file) => file.tags.includes("supabase_storage")).map((file) => file.file),
    },
    null,
    2
  )
);
