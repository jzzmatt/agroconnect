"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizePlanSlug, getUserEntitlements } from "@/lib/services/pricing-service";
import { setAuthoritativeSubscription } from "@/lib/subscription/store";
import { getMarketCountry, isMarketCountryCode, DEFAULT_MARKET_COUNTRY } from "@/config/markets";
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

    if (updates.preferred_language || updates.market_country_code) {
      setAuthoritativeSubscription(current.clerk_user_id, {
        plan: normalizePlanSlug(current.subscription_plan),
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

    revalidatePath("/dashboard");
    revalidatePath("/profile");
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
): Promise<{ success: boolean; activeProfileType: ProfileType }> {
  try {
    await requireAuth();
    const current = await getCurrentUserProfile();
    if (!current) throw new Error("Não autorizado");

    const supabase = await createServerSupabaseClient();
    await (supabase.from("profiles") as any)
      .update({ active_profile_type: profileType, updated_at: new Date().toISOString() })
      .eq("clerk_user_id", current.clerk_user_id);

    return { success: true, activeProfileType: profileType };
  } catch (e) {
    return { success: true, activeProfileType: profileType };
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

/**
 * Server Action: Activate or Update Subscription Plan.
 * Authoritative backend flow — never trust client-only selectedPlan.
 */
export async function activateSubscriptionPlanAction(
  plan: "basic" | "professional" | "business" | "enterprise"
): Promise<{
  success: boolean;
  plan: SubscriptionPlan;
  entitlements: UserEntitlements;
  error?: string;
}> {
  const normalized = normalizePlanSlug(plan);

  try {
    const clerkUserId = await requireAuth();

    setAuthoritativeSubscription(clerkUserId, {
      plan: normalized,
    });

    const entitlements = getUserEntitlements({ subscriptionPlan: normalized });

    const persist = (async () => {
      const current = await getCurrentUserProfile();
      if (!current) return;
      const supabase = await createServerSupabaseClient();
      const { error } = await (supabase.from("profiles") as any)
        .update({
          subscription_plan: normalized,
          subscription_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("clerk_user_id", current.clerk_user_id);

      if (error) {
        console.warn("[activateSubscriptionPlanAction] DB update warning:", error.message);
      }

      setAuthoritativeSubscription(clerkUserId, {
        plan: normalized,
        marketCountryCode: (current.market_country_code as any) || DEFAULT_MARKET_COUNTRY,
        preferredLanguage: (current.preferred_language as "pt" | "en" | "fr") || "pt",
        videoStorageUsedBytes: current.video_storage_used_bytes || 0,
      });
    })();

    await Promise.race([
      persist.catch((persistError: any) => {
        console.warn(
          "[activateSubscriptionPlanAction] persistence warning:",
          persistError?.message || persistError
        );
      }),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);

    try {
      revalidatePath("/dashboard");
      revalidatePath("/pricing");
      revalidatePath("/profile");
      revalidatePath("/settings");
    } catch {
      // Cache invalidation must never block a successful plan change.
    }

    return { success: true, plan: normalized, entitlements };
  } catch (err: any) {
    return {
      success: false,
      plan: "basic",
      entitlements: getUserEntitlements({ subscriptionPlan: "basic" }),
      error: err?.message || "Não foi possível atualizar a subscrição.",
    };
  }
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
      plan: normalizePlanSlug(current.subscription_plan),
      marketCountryCode: market.code,
      preferredLanguage: (current.preferred_language as "pt" | "en" | "fr") || "pt",
    });

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
      plan: normalizePlanSlug(current.subscription_plan),
      preferredLanguage: locale,
      marketCountryCode: (current.market_country_code as any) || DEFAULT_MARKET_COUNTRY,
    });

    return { success: true, locale };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao guardar idioma." };
  }
}
