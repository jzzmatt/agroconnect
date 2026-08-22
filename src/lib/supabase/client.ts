import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-agroconnect.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

/**
 * Creates an unauthenticated / public Supabase client for browser usage
 */
export function createPublicSupabaseClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function createPublicServerSupabaseClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Creates an authenticated Supabase client for browser components using Clerk's session token.
 * Uses Clerk Native Supabase Third-Party Auth integration by passing the Bearer token in the global headers.
 */
export function createAuthenticatedSupabaseClient(clerkToken: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    },
  });
}
