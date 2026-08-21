import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserProfileWithRoles } from "@/types/domain";
import type { UserRoleType, Profile } from "@/types/database";

/**
 * Get current authenticated user's ID from Clerk session
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Ensures user is authenticated; redirects or throws if not
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Não autorizado: É necessário iniciar sessão.");
  }
  return userId;
}

/**
 * Ensures user has a specific role/capability; throws friendly error if not
 */
export async function requireRole(allowedRoles: UserRoleType[]): Promise<UserProfileWithRoles> {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    throw new Error("Não autorizado: Perfil de utilizador não encontrado.");
  }

  const hasRole = profile.roles.some((r) => allowedRoles.includes(r));
  if (!hasRole && profile.account_type !== "admin") {
    throw new Error("Acesso negado: Não possui a função necessária para aceder a este recurso.");
  }

  return profile;
}

/**
 * Helper alias requested in spec: getCurrentProfile()
 */
export async function getCurrentProfile(): Promise<UserProfileWithRoles | null> {
  return getCurrentUserProfile();
}

/**
 * Fetch or automatically bootstrap current user's profile and roles from Supabase
 * Gracefully handles the bootstrap situation (Clerk user exists, Supabase profile not yet synced).
 */
export async function getCurrentUserProfile(): Promise<UserProfileWithRoles | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const supabase = await createServerSupabaseClient();

  // 1. Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", clerkUser.id)
    .single();

  // If profile doesn't exist yet, gracefully bootstrap profile
  let effectiveProfile = profile as Profile | null;
  if (!effectiveProfile) {
    const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress || null;
    const displayName =
      clerkUser.fullName ||
      (clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim() : null) ||
      primaryEmail;

    const profileSlug = clerkUser.username || `user-${clerkUser.id.slice(-8)}`;

    const { data: newProfile, error } = await (supabase.from("profiles") as any)
      .insert({
        clerk_user_id: clerkUser.id,
        display_name: displayName,
        first_name: clerkUser.firstName,
        last_name: clerkUser.lastName,
        email: primaryEmail,
        phone: clerkUser.phoneNumbers[0]?.phoneNumber || null,
        avatar_url: clerkUser.imageUrl,
        profile_slug: profileSlug,
        preferred_language: "pt",
        account_type: "customer",
        status: "active",
        theme_preference: "light",
        is_active: true,
      })
      .select("*")
      .single();

    if (!error && newProfile) {
      effectiveProfile = newProfile as Profile;
      // Default initial role: student
      await (supabase.from("user_roles") as any).insert({
        profile_id: effectiveProfile.id,
        clerk_user_id: clerkUser.id,
        role: "student",
        is_primary: true,
      });
    }
  }

  // 2. Fetch roles
  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("clerk_user_id", clerkUser.id);

  const roles: UserRoleType[] =
    (rolesData as Array<{ role: UserRoleType }> | null)?.map((r) => r.role) || ["student"];

  return {
    id: effectiveProfile?.id || clerkUser.id,
    clerk_user_id: clerkUser.id,
    display_name: effectiveProfile?.display_name || clerkUser.fullName,
    first_name: effectiveProfile?.first_name || clerkUser.firstName,
    last_name: effectiveProfile?.last_name || clerkUser.lastName,
    email: effectiveProfile?.email || clerkUser.emailAddresses[0]?.emailAddress || null,
    phone: effectiveProfile?.phone || clerkUser.phoneNumbers[0]?.phoneNumber || null,
    avatar_url: effectiveProfile?.avatar_url || clerkUser.imageUrl,
    bio: effectiveProfile?.bio || null,
    profile_slug: effectiveProfile?.profile_slug || clerkUser.username || clerkUser.id,
    preferred_language: effectiveProfile?.preferred_language || "pt",
    account_type: effectiveProfile?.account_type || "customer",
    status: effectiveProfile?.status || "active",
    theme_preference: effectiveProfile?.theme_preference || "light",
    is_active: effectiveProfile?.is_active ?? true,
    roles,
    created_at: effectiveProfile?.created_at || new Date().toISOString(),
    updated_at: effectiveProfile?.updated_at || new Date().toISOString(),
  };
}
