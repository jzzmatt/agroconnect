import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Single seam every media service reads/writes through. Kept separate from
 * @/lib/supabase/admin so tests can mock exactly this function and hand back
 * a fake client, without needing to fake the whole supabase-js surface.
 *
 * Throws instead of silently degrading: a media write with nowhere durable
 * to land is a bug, not a fallback path (see .cursor/rules/05-media.mdc).
 */
export function getMediaSupabaseClient(): SupabaseClient<Database> {
  const client = tryCreateAdminSupabaseClient();
  if (!client) {
    throw Object.assign(new Error("Supabase não está configurado neste ambiente."), {
      code: "SUPABASE_NOT_CONFIGURED",
    });
  }
  return client;
}

export function tryGetMediaSupabaseClient(): SupabaseClient<Database> | null {
  try {
    return getMediaSupabaseClient();
  } catch {
    return null;
  }
}
