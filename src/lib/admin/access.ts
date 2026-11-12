import "server-only";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { isAllowlistedAdmin } from "./allowlist";

export interface AdminActor {
  clerkUserId: string;
  profileId: string | null;
}

async function profileIdForClerkUser(clerkUserId: string): Promise<string | null> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) return null;
  try {
    const { data, error } = await (admin.from("profiles") as any)
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();
    if (error || !data?.id) return null;
    return data.id;
  } catch {
    return null;
  }
}

export async function resolveAdminActor(): Promise<AdminActor | null> {
  const { userId } = await auth();
  if (!userId || !isAllowlistedAdmin(userId)) return null;
  return { clerkUserId: userId, profileId: await profileIdForClerkUser(userId) };
}

export async function requireAdmin(): Promise<AdminActor> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/admin");
  if (!isAllowlistedAdmin(userId)) redirect("/");
  return { clerkUserId: userId, profileId: await profileIdForClerkUser(userId) };
}
