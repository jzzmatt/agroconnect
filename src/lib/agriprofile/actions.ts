"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import { invalidateCachedUserProfile } from "@/lib/auth/profile-cache";
import {
  AuthorizationError,
  authorize,
  can,
  getCurrentSubject,
} from "@/lib/authorization/server";
import { PublicProviderIdentityService } from "./provider-identity-service";
import type { OwnerProviderPublication, PublicProviderIdentity, PublicProviderPublicationAction } from "@/types/agriprofile";

function revalidateProviderPaths(slug?: string) {
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  if (slug) revalidatePath(`/providers/${slug}`);
}

export async function getPublishedProviderBySlugAction(
  slug: string
): Promise<PublicProviderIdentity | null> {
  return PublicProviderIdentityService.getPublishedBySlug(slug);
}

export async function ensureOwnProviderDraftAction(): Promise<{
  success: boolean;
  publication?: OwnerProviderPublication;
  canPublish: boolean;
  error?: string;
}> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    const subject = await getCurrentSubject();
    if (!profile) {
      return { success: false, canPublish: false, error: "Perfil não encontrado." };
    }
    const publication = await PublicProviderIdentityService.ensureDraftIdentity(profile);
    revalidateProviderPaths(publication.slug);
    return {
      success: true,
      publication,
      canPublish: can(subject, "profile.publish"),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao preparar a identidade pública.";
    return { success: false, canPublish: false, error: message };
  }
}

export async function getOwnProviderPublicationAction(): Promise<{
  publication: OwnerProviderPublication | null;
  canPublish: boolean;
}> {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  const subject = await getCurrentSubject();
  if (!profile) {
    return { publication: null, canPublish: false };
  }
  const publication = await PublicProviderIdentityService.getOwnedByProfileId(profile.id);
  return {
    publication,
    canPublish: can(subject, "profile.publish"),
  };
}

export async function transitionProviderPublicationAction(
  action: PublicProviderPublicationAction
): Promise<{ success: boolean; publication?: OwnerProviderPublication; error?: string; code?: string }> {
  try {
    const permission =
      action === "pause" ? "profile.pause" : action === "resume" ? "profile.resume" : "profile.publish";
    await authorize(permission);
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return { success: false, error: "Perfil não encontrado.", code: "AUTH_REQUIRED" };
    }
    const publication = await PublicProviderIdentityService.transition(profile, action);
    invalidateCachedUserProfile(profile.clerk_user_id);
    revalidateProviderPaths(publication.slug);
    return { success: true, publication };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return {
        success: false,
        error: "O seu plano não permite publicar o perfil público.",
        code: error.code,
      };
    }
    const message = error instanceof Error ? error.message : "Falha na publicação.";
    return { success: false, error: message, code: (error as { code?: string }).code };
  }
}
