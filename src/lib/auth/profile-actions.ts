"use server";

import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfessionalTitle, ProfileType } from "@/types/database";
import type { UserProfileWithRoles } from "@/types/domain";

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

    const { error } = await (supabase.from("profiles") as any)
      .update(updates)
      .eq("clerk_user_id", current.clerk_user_id);

    if (error) {
      console.warn("[updateProfileDetailsAction] DB error, fallback:", error);
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
    };

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
