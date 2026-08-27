import "server-only";

import { createPublicServerSupabaseClient } from "@/lib/supabase/client";
import { tryCreateAdminServerSupabaseClient } from "@/lib/supabase/server";
import { publicAreasOfWorkFromRoles } from "@/lib/auth/identity-resolvers";
import { INITIAL_PROVIDERS } from "@/lib/services/marketplace-service";
import type { PublishedExpertListItem } from "@/types/transport";

const EXPERT_ROLES = new Set([
  "expert",
  "veterinarian",
  "agronomist",
  "agricultural_consultant",
]);

export interface SearchExpertsParams {
  query?: string;
  provinceName?: string;
  limit?: number;
  offset?: number;
}

function mapProviderToExpert(
  provider: {
    id: string;
    slug: string;
    business_name: string;
    headline?: string | null;
    provider_type?: string;
    rating?: number;
    reviews_count?: number;
    verification_status?: string;
    province_name?: string | null;
    municipality_name?: string | null;
    avatar_url?: string | null;
    specialty?: string;
  }
): PublishedExpertListItem {
  return {
    id: provider.id,
    slug: provider.slug,
    name: provider.business_name.split("•")[0]?.trim() || provider.business_name,
    title: provider.headline || provider.provider_type || "Especialista Agrícola",
    specialty: provider.specialty || provider.headline || "Consultoria Agrícola",
    provinceName: provider.province_name || "Angola",
    municipalityName: provider.municipality_name || undefined,
    rating: Number(provider.rating || 4.8),
    consultationsCount: Number(provider.reviews_count || 0),
    avatarUrl: provider.avatar_url || null,
    verified: provider.verification_status === "verified",
    hourlyRate: undefined,
  };
}

function seedExperts(params: SearchExpertsParams = {}): PublishedExpertListItem[] {
  let experts = INITIAL_PROVIDERS.map((p) =>
    mapProviderToExpert({
      id: p.id,
      slug: p.slug,
      business_name: p.business_name,
      headline: p.headline,
      provider_type: p.provider_type,
      rating: p.rating,
      reviews_count: p.reviews_count,
      verification_status: p.verification_status,
      province_name: p.province_name,
      municipality_name: p.municipality_name,
      avatar_url: p.avatar_url,
      specialty: p.headline || undefined,
    })
  );

  if (params.query) {
    const q = params.query.toLowerCase();
    experts = experts.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.specialty.toLowerCase().includes(q)
    );
  }

  if (params.provinceName) {
    const province = params.provinceName.toLowerCase();
    experts = experts.filter((e) => e.provinceName.toLowerCase() === province);
  }

  const offset = params.offset || 0;
  const limit = params.limit || 50;
  return experts.slice(offset, offset + limit);
}

export class ExpertDiscoveryService {
  public static async searchPublishedExperts(
    params: SearchExpertsParams = {}
  ): Promise<{ experts: PublishedExpertListItem[]; total: number }> {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
      try {
        const supabase = tryCreateAdminServerSupabaseClient() || createPublicServerSupabaseClient();
        const { data, error } = await (supabase.from("provider_profiles") as any)
          .select(
            `
            id,
            slug,
            business_name,
            headline,
            provider_type,
            rating,
            reviews_count,
            verification_status,
            avatar_url,
            profile_id,
            provinces(name),
            municipalities(name)
          `
          )
          .eq("publication_state", "published")
          .order("published_at", { ascending: false });

        if (!error && data && data.length > 0) {
          const profileIds = data.map((row: { profile_id: string }) => row.profile_id).filter(Boolean);
          const { data: roleRows } = await (supabase.from("user_roles") as any)
            .select("profile_id, role")
            .in("profile_id", profileIds);

          const rolesByProfile = new Map<string, string[]>();
          for (const row of (roleRows as Array<{ profile_id: string; role: string }>) || []) {
            const list = rolesByProfile.get(row.profile_id) || [];
            list.push(row.role);
            rolesByProfile.set(row.profile_id, list);
          }

          let experts: PublishedExpertListItem[] = data
            .filter((row: { profile_id: string; provider_type?: string }) => {
              const roles = rolesByProfile.get(row.profile_id) || [];
              const hasExpertRole = roles.some((role) => EXPERT_ROLES.has(role));
              const expertProviderType = EXPERT_ROLES.has(row.provider_type || "");
              return hasExpertRole || expertProviderType;
            })
            .map((row: Record<string, unknown>) => {
              const provinces = row.provinces as { name?: string } | null;
              const municipalities = row.municipalities as { name?: string } | null;
              const profileId = String(row.profile_id || "");
              const roles = rolesByProfile.get(profileId) || [];
              const areas = publicAreasOfWorkFromRoles(roles);
              const specialty = areas[0]?.label || String(row.headline || "Consultoria Agrícola");

              return mapProviderToExpert({
                id: String(row.id),
                slug: String(row.slug),
                business_name: String(row.business_name),
                headline: (row.headline as string) || null,
                provider_type: (row.provider_type as string) || undefined,
                rating: row.rating != null ? Number(row.rating) : undefined,
                reviews_count: row.reviews_count != null ? Number(row.reviews_count) : undefined,
                verification_status: (row.verification_status as string) || undefined,
                province_name: provinces?.name || null,
                municipality_name: municipalities?.name || null,
                avatar_url: (row.avatar_url as string) || null,
                specialty,
              });
            });

          if (params.query) {
            const q = params.query.toLowerCase();
            experts = experts.filter(
              (e) =>
                e.name.toLowerCase().includes(q) ||
                e.title.toLowerCase().includes(q) ||
                e.specialty.toLowerCase().includes(q)
            );
          }

          if (params.provinceName) {
            const province = params.provinceName.toLowerCase();
            experts = experts.filter((e) => e.provinceName.toLowerCase() === province);
          }

          const offset = params.offset || 0;
          const limit = params.limit || 50;
          const sliced = experts.slice(offset, offset + limit);
          return { experts: sliced, total: experts.length };
        }
      } catch (err) {
        console.warn("[ExpertDiscoveryService.searchPublishedExperts] Fallback to seed:", err);
      }
    }

    const experts = seedExperts(params);
    return { experts, total: experts.length };
  }
}