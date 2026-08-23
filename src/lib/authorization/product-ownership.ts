import {
  createServerSupabaseClient,
  tryCreateAdminServerSupabaseClient,
} from "@/lib/supabase/server";
import { AuthorizationError, type CapabilitySubject } from "./policy";
import { requireOwnership } from "./ownership";

/**
 * Server-only ownership resolution. Kept out of the client-safe barrel because
 * it reaches the database.
 *
 * `products.seller_id` references `provider_profiles.id`, which in turn
 * references `profiles.id`, so a product's owner is its seller's profile.
 * Returns null when the product does not exist or ownership cannot be resolved.
 */
export async function resolveProductOwnerProfileId(
  productId: string
): Promise<string | null> {
  const client = tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());
  const { data, error } = await (client.from("products") as any)
    .select("id, seller_id, provider_profiles!inner(profile_id)")
    .eq("id", productId)
    .maybeSingle();

  if (error || !data) return null;
  const provider = (
    data as { provider_profiles?: { profile_id?: string } | Array<{ profile_id?: string }> }
  ).provider_profiles;
  const record = Array.isArray(provider) ? provider[0] : provider;
  return record?.profile_id || null;
}

/**
 * Throw unless the subject owns the product. Used by every product write path
 * that accepts a client-supplied product id.
 */
export async function requireProductOwnership(
  productId: string,
  subject: CapabilitySubject | null
): Promise<void> {
  if (!subject) {
    throw new AuthorizationError("AUTH_REQUIRED", "AUTH_REQUIRED: no authenticated subject");
  }
  if (subject.accountType === "admin") return;

  const ownerProfileId = await resolveProductOwnerProfileId(productId);
  if (!ownerProfileId) {
    throw new AuthorizationError(
      "OWNERSHIP_REQUIRED",
      "OWNERSHIP_REQUIRED: product not found or owner unresolved"
    );
  }
  requireOwnership(ownerProfileId, subject, "product");
}
