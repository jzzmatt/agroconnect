import type { ProviderPublicationState, ProviderType, ProfessionalTitle } from "./database";

/**
 * Sanitized public provider identity. Safe to return to unauthenticated callers.
 * Does not include profile_id, clerk ids, subscription, email, phone, or tax_id.
 */
export interface PublicProviderIdentity {
  id: string;
  slug: string;
  display_name: string;
  professional_title: string | null;
  professional_category: ProviderType | string | null;
  headline: string | null;
  description: string | null;
  avatar_url: string | null;
  website: string | null;
  verification_status: string;
  province_name: string | null;
  municipality_name: string | null;
  published_at: string | null;
}

export interface OwnerProviderPublication {
  id: string;
  slug: string;
  publication_state: ProviderPublicationState;
  published_at: string | null;
  paused_at: string | null;
  avatar_url: string | null;
  display_name: string;
  professional_title?: ProfessionalTitle | string | null;
}

export type PublicProviderPublicationAction = "publish" | "pause" | "resume";
