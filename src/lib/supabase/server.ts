import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-agroconnect.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

// Defined in @/lib/supabase/admin so modules shared with Client Components can
// use them without dragging Clerk's server-only auth() into a browser bundle.
export { isSupabaseConfigured, missingSupabaseEnvVars } from "@/lib/supabase/admin";

/**
 * Creates a server-side Supabase client with the current Clerk authenticated user's session token.
 * Passes the Clerk JWT natively so Supabase RLS evaluates `(auth.jwt()->>'sub')`.
 */
async function clerkTokenWithBudget() {
  const { getToken } = await auth();
  const withBudget = async (factory: () => Promise<string | null>) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        factory(),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), 2500);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  return (
    (await withBudget(() => getToken({ template: "supabase" }).catch(() => null))) ||
    (await withBudget(() => getToken().catch(() => null)))
  );
}

export async function createServerSupabaseClient() {
  const token = await clerkTokenWithBudget();

  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    token
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      : {}
  );
}

/**
 * Creates a public server-side Supabase client without authentication header
 */
export function createPublicServerSupabaseClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Creates an admin / service-role server-side Supabase client.
 * Strictly used for privileged background operations and never exposed to the client.
 */
export function createAdminServerSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function tryCreateAdminServerSupabaseClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    return createAdminServerSupabaseClient();
  } catch {
    return null;
  }
}

