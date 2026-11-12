import { createPublicServerSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export type DemoVisibility =
  | { mode: "all" }
  | { mode: "none" }
  | { mode: "keys"; keys: ReadonlySet<string> };

export interface DemoVisibilityInput {
  envEnabled: boolean;
  setting: "true" | "false" | null;
  batches: Array<{ id: string; status: string }>;
  records: Array<{ record_key: string; demo_batch_id: string; is_demo: boolean }>;
}

/**
 * The database flag wins. When it is absent, the environment flag is only a
 * fallback until an administrator has created a demo batch.
 */
export function decideDemoVisibility(input: DemoVisibilityInput): DemoVisibility {
  if (input.setting === "false") return { mode: "none" };

  const activeIds = new Set(
    input.batches.filter((batch) => batch.status === "active").map((batch) => batch.id)
  );
  const keys = new Set<string>();
  for (const record of input.records) {
    if (record.is_demo === true && activeIds.has(record.demo_batch_id)) {
      keys.add(record.record_key);
    }
  }

  if (input.setting === "true") return { mode: "keys", keys };
  if (input.batches.length === 0) return input.envEnabled ? { mode: "all" } : { mode: "none" };
  if (!input.envEnabled) return { mode: "none" };
  return { mode: "keys", keys };
}

export function selectDemoRecords<T extends { id: string }>(
  records: T[],
  visibility: DemoVisibility
): T[] {
  if (visibility.mode === "none") return [];
  if (visibility.mode === "all") return records;
  return records.filter((record) => visibility.keys.has(record.id));
}

export async function loadDemoVisibility(envEnabled: boolean): Promise<DemoVisibility> {
  if (!isSupabaseConfigured()) return envEnabled ? { mode: "all" } : { mode: "none" };

  try {
    const supabase = createPublicServerSupabaseClient();
    const settings = await (supabase.from("site_settings") as any)
      .select("value")
      .eq("key", "demo_catalog_enabled")
      .maybeSingle();
    if (settings.error) return envEnabled ? { mode: "all" } : { mode: "none" };

    const raw = typeof settings.data?.value === "string" ? settings.data.value : null;
    const setting = raw === "true" || raw === "false" ? raw : null;
    if (setting === "false") return { mode: "none" };

    const batchesResult = await (supabase.from("demo_batches") as any).select("id, status");
    if (batchesResult.error) {
      if (setting === "true") return { mode: "keys", keys: new Set() };
      return envEnabled ? { mode: "all" } : { mode: "none" };
    }
    const batches = Array.isArray(batchesResult.data) ? batchesResult.data : [];
    const recordsResult = await (supabase.from("demo_batch_records") as any)
      .select("record_key, demo_batch_id, is_demo")
      .eq("is_demo", true);
    if (recordsResult.error) {
      if (setting === "true" || batches.length > 0) return { mode: "keys", keys: new Set() };
      return envEnabled ? { mode: "all" } : { mode: "none" };
    }

    return decideDemoVisibility({
      envEnabled,
      setting,
      batches,
      records: Array.isArray(recordsResult.data) ? recordsResult.data : [],
    });
  } catch {
    return envEnabled ? { mode: "all" } : { mode: "none" };
  }
}
