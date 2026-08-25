"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, getCurrentUserProfile, getCurrentUserId } from "@/lib/clerk/auth";
import { invalidateCachedUserProfile } from "@/lib/auth/profile-cache";
import {
  createServerSupabaseClient,
  tryCreateAdminServerSupabaseClient,
} from "@/lib/supabase/server";
import { parseStoredPlan, getUserEntitlements } from "@/lib/services/pricing-service";
import { setAuthoritativeSubscription } from "@/lib/subscription/store";
import { getMarketCountry, isMarketCountryCode, DEFAULT_MARKET_COUNTRY } from "@/config/markets";
import { PublicProviderIdentityService } from "@/lib/agriprofile/provider-identity-service";
import type { ProfessionalTitle, ProfileType, SubscriptionPlan } from "@/types/database";
import type { UserEntitlements, UserProfileWithRoles } from "@/types/domain";

export interface UpdateProfileInput {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  whatsappPhone?: string;
  bio?: string;
  professionalTitle?: ProfessionalTitle;
  professionalTitleCustom?: string;
  activeProfileType?: ProfileType;
  preferredLanguage?: "pt" | "en" | "fr";
  marketCountryCode?: string;
  provinceName?: string;
  municipalityName?: string;
}

/**
 * Server Action: Update authenticated user's profile details
 */
export async function updateProfileDetailsAction(
  input: UpdateProfileInput
): Promise<{ success: boolean; profile?: UserProfileWithRoles; error?: string }> {
  try {
    await requireAuth();
    const current = await getCurrentUserProfile();
    if (!current) {
      return { success: false, error: "Perfil não encontrado." };
    }

    const supabase = await createServerSupabaseClient();

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.displayName !== undefined) updates.display_name = input.displayName.trim() || null;
    if (input.firstName !== undefined) updates.first_name = input.firstName.trim() || null;
    if (input.lastName !== undefined) updates.last_name = input.lastName.trim() || null;
    if (input.phone !== undefined) updates.phone = input.phone.trim() || null;
    if (input.whatsappPhone !== undefined) updates.whatsapp_phone = input.whatsappPhone.trim() || null;
    if (input.bio !== undefined) updates.bio = input.bio.trim() || null;
    if (input.professionalTitle !== undefined) updates.professional_title = input.professionalTitle;
    if (input.professionalTitleCustom !== undefined) {
      updates.professional_title_custom = input.professionalTitleCustom.trim() || null;
    }
    if (input.activeProfileType !== undefined) {
      updates.active_profile_type = input.activeProfileType;
    }
    if (input.preferredLanguage !== undefined) {
      if (!["pt", "en", "fr"].includes(input.preferredLanguage)) {
        return { success: false, error: "Idioma inválido." };
      }
      updates.preferred_language = input.preferredLanguage;
    }
    if (input.marketCountryCode !== undefined) {
      const entitlements = getUserEntitlements({
        subscriptionPlan: current.subscription_plan,
        roles: current.roles,
      });
      if (!entitlements.can_change_market_country) {
        return {
          success: false,
          error: "A alteração do país de atuação está disponível a partir do plano Profissional.",
        };
      }
      if (!isMarketCountryCode(input.marketCountryCode)) {
        return { success: false, error: "País de atuação inválido." };
      }
      updates.market_country_code = input.marketCountryCode.toUpperCase();
    }

    const { error } = await (supabase.from("profiles") as any)
      .update(updates)
      .eq("clerk_user_id", current.clerk_user_id);

    if (error) {
      console.warn("[updateProfileDetailsAction] DB error, fallback:", error);
    }

    invalidateCachedUserProfile(current.clerk_user_id);

    if (updates.preferred_language || updates.market_country_code) {
      setAuthoritativeSubscription(current.clerk_user_id, {
        plan: parseStoredPlan(current.subscription_plan),
        preferredLanguage: updates.preferred_language,
        marketCountryCode: updates.market_country_code,
      });
    }

    const updatedProfile: UserProfileWithRoles = {
      ...current,
      display_name: updates.display_name !== undefined ? updates.display_name : current.display_name,
      first_name: updates.first_name !== undefined ? updates.first_name : current.first_name,
      last_name: updates.last_name !== undefined ? updates.last_name : current.last_name,
      phone: updates.phone !== undefined ? updates.phone : current.phone,
      whatsapp_phone: updates.whatsapp_phone !== undefined ? updates.whatsapp_phone : current.whatsapp_phone,
      bio: updates.bio !== undefined ? updates.bio : current.bio,
      professional_title: updates.professional_title !== undefined ? updates.professional_title : current.professional_title,
      professional_title_custom: updates.professional_title_custom !== undefined ? updates.professional_title_custom : current.professional_title_custom,
      active_profile_type: updates.active_profile_type !== undefined ? updates.active_profile_type : current.active_profile_type,
      preferred_language: updates.preferred_language !== undefined ? updates.preferred_language : current.preferred_language,
      market_country_code: updates.market_country_code !== undefined ? updates.market_country_code : current.market_country_code,
    };

    await PublicProviderIdentityService.syncFromPrivateProfile(updatedProfile, {
      provinceName: input.provinceName,
      municipalityName: input.municipalityName,
    }).catch(() => undefined);

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    revalidatePath("/profile/edit");
    revalidatePath("/settings");

    return { success: true, profile: updatedProfile };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao atualizar perfil." };
  }
}

/**
 * Server Action: Switch Active Profile Context
 */
export async function switchActiveProfileTypeAction(
  profileType: ProfileType
): Promise<{ success: boolean; activeProfileType: ProfileType; error?: string }> {
  try {
    await requireAuth();
    const current = await getCurrentUserProfile();
    if (!current) {
      return { success: false, activeProfileType: profileType, error: "Perfil não encontrado." };
    }

    // The admin client is preferred for the same reason every other write path
    // prefers it: when the Clerk JWT is not a Supabase JWT, an RLS-scoped update
    // matches zero rows and the switch is silently lost on the next page load.
    const supabase =
      tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());
    const { error } = await (supabase.from("profiles") as any)
      .update({ active_profile_type: profileType, updated_at: new Date().toISOString() })
      .eq("clerk_user_id", current.clerk_user_id);

    if (error) {
      console.warn("[switchActiveProfileType] persist failed:", error.message);
      return { success: false, activeProfileType: profileType, error: error.message };
    }

    invalidateCachedUserProfile(current.clerk_user_id);

    revalidatePath("/profile");
    return { success: true, activeProfileType: profileType };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e || "");
    console.warn("[switchActiveProfileType] persist failed:", message);
    return { success: false, activeProfileType: profileType, error: message };
  }
}

/** Profile types that map onto a `user_roles.role` value. */
const ROLE_BACKED_PROFILE_TYPES = [
  "veterinarian",
  "expert",
  "instructor",
  "student",
  "seller",
  "farmer",
  "service_provider",
  "business",
] as const;

type RoleBackedProfileType = (typeof ROLE_BACKED_PROFILE_TYPES)[number];

function toRoleBackedTypes(types: ProfileType[]): RoleBackedProfileType[] {
  const allowed = new Set<string>(ROLE_BACKED_PROFILE_TYPES);
  // `personal` is implicit rather than a stored role, so it is dropped here.
  const unique = Array.from(new Set(types.filter((type) => allowed.has(type))));
  return unique as RoleBackedProfileType[];
}

/**
 * Server Action: Persist the user's selected profile types.
 *
 * Profile types are stored as `user_roles` rows, which is what
 * `getCurrentUserProfile()` reads back. Without this the selection only ever
 * reached localStorage, so it was lost on the next load.
 */
export async function updateProfileTypesAction(
  profileTypes: ProfileType[]
): Promise<{ success: boolean; profileTypes: ProfileType[]; error?: string }> {
  try {
    await requireAuth();
    const current = await getCurrentUserProfile();
    if (!current) {
      return { success: false, profileTypes: [], error: "Perfil não encontrado." };
    }

    const desired = toRoleBackedTypes(profileTypes);
    if (desired.length === 0) {
      return {
        success: false,
        profileTypes: current.roles as ProfileType[],
        error: "Selecione pelo menos uma área de atividade.",
      };
    }

    const supabase =
      tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());

    const { data: existingRows, error: readError } = await (supabase.from("user_roles") as any)
      .select("role")
      .eq("clerk_user_id", current.clerk_user_id);

    if (readError) {
      console.warn("[updateProfileTypes] read failed:", readError.message);
      return { success: false, profileTypes: [], error: readError.message };
    }

    const existing = new Set<string>(
      ((existingRows as Array<{ role: string }> | null) || []).map((row) => row.role)
    );
    const toInsert = desired.filter((role) => !existing.has(role));
    const toRemove = Array.from(existing).filter(
      (role) => !(desired as string[]).includes(role)
    );

    if (toInsert.length > 0) {
      const { error: insertError } = await (supabase.from("user_roles") as any).insert(
        toInsert.map((role, index) => ({
          profile_id: current.id,
          clerk_user_id: current.clerk_user_id,
          role,
          is_primary: existing.size === 0 && index === 0,
        }))
      );
      if (insertError) {
        console.warn("[updateProfileTypes] insert failed:", insertError.message);
        return { success: false, profileTypes: [], error: insertError.message };
      }
    }

    if (toRemove.length > 0) {
      const { error: deleteError } = await (supabase.from("user_roles") as any)
        .delete()
        .eq("clerk_user_id", current.clerk_user_id)
        .in("role", toRemove);
      if (deleteError) {
        console.warn("[updateProfileTypes] delete failed:", deleteError.message);
        return { success: false, profileTypes: [], error: deleteError.message };
      }
    }

    invalidateCachedUserProfile(current.clerk_user_id);

    // An active profile the user no longer holds would otherwise persist and
    // read back as a type that is not in their list.
    if (!(desired as string[]).includes(current.active_profile_type as string)) {
      await (supabase.from("profiles") as any)
        .update({ active_profile_type: desired[0], updated_at: new Date().toISOString() })
        .eq("clerk_user_id", current.clerk_user_id);
    }

    revalidatePath("/profile");
    revalidatePath("/profile/edit");
    return { success: true, profileTypes: desired as ProfileType[] };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e || "");
    console.warn("[updateProfileTypes] failed:", message);
    return { success: false, profileTypes: [], error: message };
  }
}

/**
 * Server Action: Get authenticated user's profile details including plan, roles, etc.
 */
export async function getProfileDetailsAction(): Promise<UserProfileWithRoles | null> {
  try {
    const current = await getCurrentUserProfile();
    return current;
  } catch (e) {
    return null;
  }
}

export type AuthoritativeSubscriptionResult = {
  authenticated: boolean;
  plan: SubscriptionPlan | null;
  source: "database" | null;
  error: string | null;
  marketCountryCode?: string | null;
  preferredLanguage?: string | null;
  videoStorageUsedBytes?: number;
};

/**
 * Load the current subscription plan from the database for the signed-in user.
 * Browser storage, URL parameters, and process-local caches are not consulted.
 */
export async function getAuthoritativeSubscriptionAction(): Promise<AuthoritativeSubscriptionResult> {
  try {
    const current = await getCurrentUserProfile();
    if (!current) {
      const userId = await getCurrentUserId();
      if (!userId) {
        return { authenticated: false, plan: null, source: null, error: null };
      }
      return {
        authenticated: true,
        plan: null,
        source: null,
        error: "Não foi possível carregar a subscrição a partir da base de dados.",
      };
    }
    return {
      authenticated: true,
      plan: parseStoredPlan(current.subscription_plan),
      source: "database",
      error: null,
      marketCountryCode: current.market_country_code,
      preferredLanguage: current.preferred_language,
      videoStorageUsedBytes: current.video_storage_used_bytes || 0,
    };
  } catch (e) {
    const userId = await getCurrentUserId().catch(() => null);
    if (!userId) {
      return { authenticated: false, plan: null, source: null, error: null };
    }
    return {
      authenticated: true,
      plan: null,
      source: null,
      error: e instanceof Error ? e.message : "Erro ao carregar o plano.",
    };
  }
}

/**
 * Server Action: Activate or Update Subscription Plan.
 * Prefer POST /api/subscription/activate from the browser — server actions can
 * abort with "message port closed" when the page navigates or Chrome extensions
 * intercept the channel.
 */
export async function activateSubscriptionPlanAction(
  plan: "basic" | "professional" | "business" | "enterprise"
): Promise<{
  success: boolean;
  plan: SubscriptionPlan | null;
  entitlements: UserEntitlements;
  error?: string;
}> {
  const { activateUserSubscriptionPlan } = await import("@/lib/subscription/activate-plan");
  const result = await activateUserSubscriptionPlan(plan);
  if (result.success) {
    try {
      revalidatePath("/dashboard");
      revalidatePath("/pricing");
      revalidatePath("/planos");
      revalidatePath("/profile");
      revalidatePath("/settings");
    } catch {
      // Cache invalidation must never block a successful plan change.
    }
  }
  return result;
}

/**
 * Server Action: Update market country (Professional+ only). Does NOT change UI language.
 */
export async function updateMarketCountryAction(
  countryCode: string
): Promise<{ success: boolean; countryCode?: string; error?: string }> {
  try {
    await requireAuth();
    const current = await getCurrentUserProfile();
    if (!current) return { success: false, error: "Não autorizado" };

    const entitlements = getUserEntitlements({
      subscriptionPlan: current.subscription_plan,
      roles: current.roles,
    });
    if (!entitlements.can_change_market_country) {
      return {
        success: false,
        error: "A alteração do país de atuação está disponível a partir do plano Profissional.",
      };
    }
    if (!isMarketCountryCode(countryCode)) {
      return { success: false, error: "País inválido." };
    }

    const market = getMarketCountry(countryCode);
    const supabase = await createServerSupabaseClient();
    await (supabase.from("profiles") as any)
      .update({
        market_country_code: market.code,
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_user_id", current.clerk_user_id);

    setAuthoritativeSubscription(current.clerk_user_id, {
      plan: parseStoredPlan(current.subscription_plan),
      marketCountryCode: market.code,
      preferredLanguage: (current.preferred_language as "pt" | "en" | "fr") || "pt",
    });

    invalidateCachedUserProfile(current.clerk_user_id);

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    revalidatePath("/settings");
    revalidatePath("/checkout");

    return { success: true, countryCode: market.code };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao atualizar país de atuação." };
  }
}

/**
 * Server Action: Persist UI language. Does NOT change market country.
 */
export async function updatePreferredLanguageAction(
  locale: "pt" | "en" | "fr"
): Promise<{ success: boolean; locale?: string; error?: string }> {
  try {
    await requireAuth();
    const current = await getCurrentUserProfile();
    if (!current) return { success: false, error: "Não autorizado" };
    if (!["pt", "en", "fr"].includes(locale)) {
      return { success: false, error: "Idioma inválido." };
    }

    const supabase = await createServerSupabaseClient();
    await (supabase.from("profiles") as any)
      .update({ preferred_language: locale, updated_at: new Date().toISOString() })
      .eq("clerk_user_id", current.clerk_user_id);

    setAuthoritativeSubscription(current.clerk_user_id, {
      plan: parseStoredPlan(current.subscription_plan),
      preferredLanguage: locale,
      marketCountryCode: (current.market_country_code as any) || DEFAULT_MARKET_COUNTRY,
    });

    invalidateCachedUserProfile(current.clerk_user_id);

    return { success: true, locale };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao guardar idioma." };
  }
}
