import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-agroconnect.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

/**
 * Creates a server-side Supabase client with the current Clerk authenticated user's session token.
 * Passes the Clerk JWT natively so Supabase RLS evaluates `(auth.jwt()->>'sub')`.
 */
export async function createServerSupabaseClient() {
  const { getToken } = await auth();
  const token = await getToken();

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
