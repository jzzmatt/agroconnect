import {
  createPublicServerSupabaseClient,
  createServerSupabaseClient,
  tryCreateAdminServerSupabaseClient,
} from "@/lib/supabase/server";
import type { OwnerProviderPublication, PublicProviderIdentity, PublicProviderPublicationAction } from "@/types/agriprofile";
import type { ProviderPublicationState, ProviderType } from "@/types/database";
import type { UserProfileWithRoles } from "@/types/domain";
import {
  buildProviderSlug,
  canTransitionPublication,
  isPubliclyDiscoverable,
  targetStateForAction,
  toOwnerProviderPublication,
  toPublicProviderIdentity,
  type PublicProviderSource,
} from "./publication";

async function writableClient() {
  return tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());
}

function mapSource(row: Record<string, unknown>, extras: Partial<PublicProviderSource> = {}): PublicProviderSource {
  const provinces = row.provinces as { name?: string } | null | undefined;
  const municipalities = row.municipalities as { name?: string } | null | undefined;
  return {
    id: String(row.id || ""),
    slug: String(row.slug || ""),
    publication_state: (row.publication_state as string) || "draft",
    business_name: (row.business_name as string) || null,
    display_name: extras.display_name || null,
    professional_title: extras.professional_title || null,
    professional_title_custom: extras.professional_title_custom || null,
    provider_type: (row.provider_type as string) || null,
    headline: (row.headline as string) || null,
    description: (row.description as string) || null,
    avatar_url: (row.avatar_url as string) || extras.avatar_url || null,
    website: (row.website as string) || null,
    verification_status: (row.verification_status as string) || "unverified",
    province_name: extras.province_name || provinces?.name || null,
    municipality_name: extras.municipality_name || municipalities?.name || null,
    published_at: (row.published_at as string) || null,
    profile_id: (row.profile_id as string) || null,
    email: (row.email as string) || null,
    phone: (row.phone as string) || null,
  };
}

/**
 * AgriProfile public-provider identity. Does not own products, courses, or commerce.
 */
export class PublicProviderIdentityService {
  public static async getPublishedBySlug(slug: string): Promise<PublicProviderIdentity | null> {
    const normalized = slug.trim();
    if (!normalized) return null;

    try {
      const supabase = createPublicServerSupabaseClient();
      const { data, error } = await supabase
        .from("provider_profiles")
        .select(
          `
          id,
          slug,
          publication_state,
          business_name,
          provider_type,
          headline,
          description,
          avatar_url,
          website,
          verification_status,
          published_at,
          provinces(name),
          municipalities(name)
        `
        )
        .eq("slug", normalized)
        .eq("publication_state", "published")
        .maybeSingle();

      if (error || !data) return null;
      return toPublicProviderIdentity(mapSource(data as Record<string, unknown>));
    } catch {
      return null;
    }
  }

  public static async getOwnedByProfileId(
    profileId: string
  ): Promise<OwnerProviderPublication | null> {
    const supabase = await writableClient();
    const { data } = await (supabase.from("provider_profiles") as any)
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (!data) return null;
    return toOwnerProviderPublication(data);
  }

  public static async ensureDraftIdentity(
    profile: UserProfileWithRoles
  ): Promise<OwnerProviderPublication> {
    const existing = await this.getOwnedByProfileId(profile.id);
    if (existing) return existing;

    const supabase = await writableClient();
    const slug =
      profile.profile_slug ||
      buildProviderSlug(profile.display_name || "prestador", profile.id);

    const { data, error } = await (supabase.from("provider_profiles") as any)
      .insert({
        profile_id: profile.id,
        business_name: profile.display_name || "Prestador AgriConnect",
        slug,
        headline: null,
        description: profile.bio || null,
        provider_type: (profile.roles.find((role) =>
          ["veterinarian", "agronomist", "instructor", "agricultural_consultant"].includes(role)
        ) || "individual") as ProviderType,
        phone: profile.phone,
        email: profile.email,
        verification_status: "unverified",
        status: "active",
        publication_state: "draft",
        avatar_url: profile.avatar_url,
        latitude: -12.5,
        longitude: 17.5,
        service_radius_km: 50,
      })
      .select("*")
      .single();

    if (error || !data) {
      const raced = await this.getOwnedByProfileId(profile.id);
      if (raced) return raced;
      throw new Error(error?.message || "Não foi possível criar a identidade pública.");
    }
    return toOwnerProviderPublication(data);
  }

  public static async transition(
    profile: UserProfileWithRoles,
    action: PublicProviderPublicationAction
  ): Promise<OwnerProviderPublication> {
    const identity = await this.ensureDraftIdentity(profile);
    if (!canTransitionPublication(identity.publication_state, action)) {
      throw Object.assign(
        new Error(`PUBLICATION_TRANSITION_DENIED: ${identity.publication_state} → ${action}`),
        { code: "PUBLICATION_TRANSITION_DENIED" }
      );
    }

    const next = targetStateForAction(action);
    const now = new Date().toISOString();
    const supabase = await writableClient();
    const { data, error } = await (supabase.from("provider_profiles") as any)
      .update({
        publication_state: next as ProviderPublicationState,
        published_at: next === "published" ? identity.published_at || now : identity.published_at,
        paused_at: next === "paused" ? now : null,
        avatar_url: profile.avatar_url || identity.avatar_url,
        business_name: profile.display_name || identity.display_name,
        description: profile.bio || null,
        updated_at: now,
      })
      .eq("id", identity.id)
      .eq("profile_id", profile.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Não foi possível atualizar a publicação.");
    }
    return toOwnerProviderPublication(data);
  }

  public static async syncAvatarUrl(profileId: string, avatarUrl: string | null): Promise<void> {
    const supabase = await writableClient();
    await (supabase.from("provider_profiles") as any)
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq("profile_id", profileId);
  }

  public static isDiscoverable(state: string | null | undefined): boolean {
    return isPubliclyDiscoverable(state);
  }
}
