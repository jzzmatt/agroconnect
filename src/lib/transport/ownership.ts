import "server-only";

import { AuthorizationError } from "@/lib/authorization/server";
import type { UserProfileWithRoles } from "@/types/domain";
import { getTransportWritableClient } from "./supabase-client";

export async function requireTransportOwnership(
  transportId: string,
  profile: UserProfileWithRoles
): Promise<{ providerId: string }> {
  const supabase = await getTransportWritableClient();
  const { data: transport, error } = await (supabase.from("transport_services") as any)
    .select("id, provider_id, provider_profiles(profile_id)")
    .eq("id", transportId)
    .maybeSingle();

  if (error || !transport) {
    throw new AuthorizationError("OWNERSHIP_REQUIRED", "Transporte não encontrado.");
  }

  const ownerProfileId = transport.provider_profiles?.profile_id;
  if (!ownerProfileId || ownerProfileId !== profile.id) {
    throw new AuthorizationError("OWNERSHIP_REQUIRED", "Não autorizado a gerir este transporte.");
  }

  return { providerId: transport.provider_id as string };
}
