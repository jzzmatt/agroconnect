import {
  createServerSupabaseClient,
  tryCreateAdminServerSupabaseClient,
} from "@/lib/supabase/server";

/**
 * Privileged academy writes prefer the service-role client. When it is
 * unavailable, fall back to a Clerk-authenticated client so RLS policies
 * that depend on current_clerk_user_id() still pass.
 */
export async function getAcademyWritableClient() {
  return tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());
}
