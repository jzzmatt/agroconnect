import type {
  OwnerProviderPublication,
  PublicProviderIdentity,
  PublicProviderPublicationAction,
} from "@/types/agriprofile";
import type { ProviderPublicationState } from "@/types/database";

export const PROVIDER_PUBLICATION_STATES = ["draft", "published", "paused"] as const;

export function isProviderPublicationState(
  value: string | null | undefined
): value is ProviderPublicationState {
  return value === "draft" || value === "published" || value === "paused";
}

export function isPubliclyDiscoverable(
  state: ProviderPublicationState | string | null | undefined
): boolean {
  return state === "published";
}

const ALLOWED_TRANSITIONS: Record<ProviderPublicationState, ProviderPublicationState[]> = {
  draft: ["published"],
  published: ["paused"],
  paused: ["published"],
};

export function canTransitionPublication(
  from: ProviderPublicationState,
  action: PublicProviderPublicationAction
): boolean {
  const target = targetStateForAction(action);
  return ALLOWED_TRANSITIONS[from].includes(target);
}

export function targetStateForAction(
  action: PublicProviderPublicationAction
): ProviderPublicationState {
  if (action === "pause") return "paused";
  return "published";
}

export function publicationStateLabel(state: ProviderPublicationState): string {
  if (state === "published") return "Publicado";
  if (state === "paused") return "Pausado";
  return "Rascunho";
}

const PRIVATE_PUBLIC_PROVIDER_KEYS = [
  "profile_id",
  "clerk_user_id",
  "phone",
  "tax_id",
  "subscription_plan",
  "subscription_status",
  "account_type",
  "roles",
] as const;

export type PublicProviderSource = {
  id: string;
  slug: string;
  publication_state?: ProviderPublicationState | string | null;
  business_name?: string | null;
  display_name?: string | null;
  professional_title?: string | null;
  professional_title_custom?: string | null;
  provider_type?: string | null;
  headline?: string | null;
  description?: string | null;
  avatar_url?: string | null;
  website?: string | null;
  verification_status?: string | null;
  province_name?: string | null;
  municipality_name?: string | null;
  published_at?: string | null;
  profile_id?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp_phone?: string | null;
  areas_of_work?: PublicProviderIdentity["areas_of_work"];
  tax_id?: string | null;
  subscription_plan?: string | null;
};

export function toPublicProviderIdentity(
  source: PublicProviderSource | null | undefined
): PublicProviderIdentity | null {
  if (!source) return null;
  if (!isPubliclyDiscoverable(source.publication_state)) return null;

  const displayName =
    (source.display_name || source.business_name || "").trim() || "Prestador";
  const title =
    source.professional_title && source.professional_title !== "none"
      ? source.professional_title === "custom"
        ? source.professional_title_custom || null
        : source.professional_title
      : null;

  const identity: PublicProviderIdentity = {
    id: source.id,
    slug: source.slug,
    display_name: displayName,
    professional_title: title,
    professional_category: source.provider_type || null,
    headline: source.headline || null,
    description: source.description || null,
    avatar_url: source.avatar_url || null,
    website: source.website || null,
    email: (source.email || "").trim() || null,
    whatsapp_phone: (source.whatsapp_phone || source.phone || "").trim() || null,
    verification_status: source.verification_status || "unverified",
    province_name: source.province_name || null,
    municipality_name: source.municipality_name || null,
    areas_of_work: source.areas_of_work || [],
    published_at: source.published_at || null,
  };

  for (const key of PRIVATE_PUBLIC_PROVIDER_KEYS) {
    if (key in identity) {
      delete (identity as unknown as Record<string, unknown>)[key];
    }
  }

  return identity;
}

export function toOwnerProviderPublication(source: {
  id: string;
  slug: string;
  publication_state?: string | null;
  published_at?: string | null;
  paused_at?: string | null;
  avatar_url?: string | null;
  business_name?: string | null;
  display_name?: string | null;
  professional_title?: string | null;
}): OwnerProviderPublication {
  const state = isProviderPublicationState(source.publication_state)
    ? source.publication_state
    : "draft";
  return {
    id: source.id,
    slug: source.slug,
    publication_state: state,
    published_at: source.published_at || null,
    paused_at: source.paused_at || null,
    avatar_url: source.avatar_url || null,
    display_name: (source.display_name || source.business_name || "").trim() || "Prestador",
    professional_title: source.professional_title || null,
  };
}

export function buildProviderSlug(input: string, uniqueSuffix: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = uniqueSuffix.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase();
  return `${base || "prestador"}-${suffix || "id"}`;
}

export function isManagedProfileImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("imagekit.io") || url.includes("/agriconnect/profiles/");
}
