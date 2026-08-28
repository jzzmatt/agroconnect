import { getCurrentUserProfile } from "@/lib/clerk/auth";
import { createServerSupabaseClient, tryCreateAdminServerSupabaseClient } from "@/lib/supabase/server";

export async function resolveSessionSellerIds(): Promise<string[]> {
  const profile = await getCurrentUserProfile();
  if (!profile) return [];
  const supabase = tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());
  const profileIds = new Set<string>([profile.id].filter(Boolean));
  if (profile.clerk_user_id) {
    const { data: profileRows } = await (supabase.from("profiles") as any)
      .select("id")
      .eq("clerk_user_id", profile.clerk_user_id);
    for (const row of profileRows || []) {
      if (row?.id) profileIds.add(String(row.id));
    }
  }
  const { data } = await (supabase.from("provider_profiles") as any)
    .select("id")
    .in("profile_id", [...profileIds]);
  const ids: string[] = [];
  for (const row of data || []) {
    const id = String((row as { id?: string })?.id || "");
    if (id) ids.push(id);
  }
  return [...new Set(ids)];
}

export async function resolveSessionSellerId(): Promise<string | null> {
  const ids = await resolveSessionSellerIds();
  return ids[0] || null;
}
