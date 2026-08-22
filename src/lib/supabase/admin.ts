import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client and configuration checks, deliberately free of any Clerk
 * import. `@/lib/supabase/server` pulls in Clerk's server-only `auth()`, so
 * importing it from a module that a Client Component also imports breaks the
 * build. Anything needed on both sides belongs here.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-agroconnect.supabase.co";

/**
 * The Supabase clients fall back to a placeholder host so imports never crash.
 * Any write must check this first, otherwise the request goes to a domain that
 * does not resolve and surfaces as an opaque "fetch failed".
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  return (
    url.startsWith("http") &&
    !url.includes("placeholder") &&
    Boolean(key) &&
    !key.includes("placeholder")
  );
}

/** Names of the environment variables missing for database access. */
export function missingSupabaseEnvVars(): string[] {
  const missing: string[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  if (!url.startsWith("http") || url.includes("placeholder")) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!key || key.includes("placeholder")) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  return missing;
}

/**
 * Privileged client for server-side work. Never reachable from the browser:
 * SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix, so it is undefined in
 * client bundles and this returns null there.
 */
export function tryCreateAdminSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;
  try {
    return createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch {
    return null;
  }
}
