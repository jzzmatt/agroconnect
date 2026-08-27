import "server-only";

import {
  createServerSupabaseClient,
  tryCreateAdminServerSupabaseClient,
} from "@/lib/supabase/server";

export async function getTransportWritableClient() {
  return tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());
}
