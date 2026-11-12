import "server-only";

import { isAllowlistedAdmin } from "./allowlist";
import { isClosedAccount } from "./catalog-target";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AccountActionError = "unavailable" | "not_found" | "protected" | "dependency" | "failed";

function parseProfileId(id: string): string | null {
  const value = id.trim().toLowerCase();
  return UUID.test(value) ? value : null;
}

type LoadedAccount = {
  id: string;
  clerk_user_id: string;
  display_name: string | null;
  email: string | null;
  status: string | null;
  is_active: boolean | null;
};

async function loadTarget(
  profileId: string
): Promise<{ ok: true; admin: NonNullable<ReturnType<typeof tryCreateAdminSupabaseClient>>; profile: LoadedAccount } | { ok: false; error: AccountActionError }> {
  const parsed = parseProfileId(profileId);
  if (!parsed) return { ok: false, error: "not_found" };
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) return { ok: false, error: "unavailable" };
  const { data, error } = await (admin.from("profiles") as any)
    .select("id, clerk_user_id, display_name, email, status, is_active")
    .eq("id", parsed)
    .maybeSingle();
  if (error) return { ok: false, error: "unavailable" };
  if (!data?.id) return { ok: false, error: "not_found" };
  return { ok: true, admin, profile: data as LoadedAccount };
}

function protectedTarget(actor: { clerkUserId: string; profileId: string | null }, clerkUserId: string, profileId: string): boolean {
  if (actor.profileId && actor.profileId === profileId) return true;
  if (actor.clerkUserId === clerkUserId) return true;
  return isAllowlistedAdmin(clerkUserId);
}

async function pausePublicListings(admin: NonNullable<ReturnType<typeof tryCreateAdminSupabaseClient>>, profileId: string) {
  const providers = await (admin.from("provider_profiles") as any).select("id").eq("profile_id", profileId);
  if (providers.error) return false;
  const providerIds = (providers.data || []).map((row: { id: string }) => row.id);
  const providerUpdate = await (admin.from("provider_profiles") as any)
    .update({ status: "inactive" })
    .eq("profile_id", profileId);
  if (providerUpdate.error) return false;
  if (providerIds.length > 0) {
    const paused = await Promise.all([
      (admin.from("products") as any).update({ status: "paused" }).in("seller_id", providerIds).in("status", ["published", "active"]),
      (admin.from("services") as any).update({ status: "paused" }).in("provider_id", providerIds).in("status", ["published", "active"]),
      (admin.from("transport_services") as any).update({ status: "paused" }).in("provider_id", providerIds).eq("status", "published"),
    ]);
    if (paused.some((result) => result.error)) return false;
  }
  const courses = await (admin.from("courses") as any)
    .update({ status: "paused" })
    .eq("owner_id", profileId)
    .eq("status", "published");
  return !courses.error;
}

export async function setAccountOpen(
  actor: { clerkUserId: string; profileId: string | null },
  profileId: string,
  open: boolean
): Promise<{ ok: true; id: string; name: string } | { ok: false; error: AccountActionError }> {
  try {
    const target = await loadTarget(profileId);
    if (!target.ok) return target;
    if (protectedTarget(actor, target.profile.clerk_user_id, target.profile.id)) {
      return { ok: false, error: "protected" };
    }
    const nextStatus = open ? "active" : "inactive";
    const already = open
      ? !isClosedAccount(target.profile.status, target.profile.is_active)
      : isClosedAccount(target.profile.status, target.profile.is_active);
    if (!already || !open) {
      const updated = await (target.admin.from("profiles") as any)
        .update({ status: nextStatus, is_active: open })
        .eq("id", target.profile.id)
        .select("id");
      if (updated.error) return { ok: false, error: "failed" };
      if (!Array.isArray(updated.data) || updated.data.length !== 1) return { ok: false, error: "not_found" };
    }
    if (!open) {
      const paused = await pausePublicListings(target.admin, target.profile.id);
      if (!paused) return { ok: false, error: "failed" };
    } else {
      const providers = await (target.admin.from("provider_profiles") as any)
        .update({ status: "active" })
        .eq("profile_id", target.profile.id);
      if (providers.error) return { ok: false, error: "failed" };
    }
    return {
      ok: true,
      id: target.profile.id,
      name: target.profile.display_name || target.profile.email || target.profile.id,
    };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function removeAccount(
  actor: { clerkUserId: string; profileId: string | null },
  profileId: string
): Promise<{ ok: true; id: string; name: string } | { ok: false; error: AccountActionError }> {
  try {
    const target = await loadTarget(profileId);
    if (!target.ok) return target;
    if (protectedTarget(actor, target.profile.clerk_user_id, target.profile.id)) {
      return { ok: false, error: "protected" };
    }
    const deleted = await (target.admin.from("profiles") as any).delete().eq("id", target.profile.id).select("id");
    if (deleted.error) {
      const code = typeof deleted.error.code === "string" ? deleted.error.code : "";
      if (code === "23503") return { ok: false, error: "dependency" };
      return { ok: false, error: "failed" };
    }
    if (!Array.isArray(deleted.data) || deleted.data.length !== 1) return { ok: false, error: "not_found" };
    return {
      ok: true,
      id: target.profile.id,
      name: target.profile.display_name || target.profile.email || target.profile.id,
    };
  } catch {
    return { ok: false, error: "failed" };
  }
}
