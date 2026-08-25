import type { ProviderPublicationState, ProviderType, ProfessionalTitle } from "./database";

export interface PublicProviderAreaOfWork {
  slug: string;
  label: string;
}

/**
 * Public provider identity. Safe to return to unauthenticated callers.
 * Includes contact and work fields intended for public display.
 * Does not include profile_id, clerk ids, subscription, tax_id, or account_type.
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
  email: string | null;
  whatsapp_phone: string | null;
  province_name: string | null;
  municipality_name: string | null;
  areas_of_work: PublicProviderAreaOfWork[];
  verification_status: string;
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
