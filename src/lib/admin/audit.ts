import "server-only";

import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

export async function writeAdminAudit(entry: {
  actorProfileId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) return;
  try {
    const { error } = await (admin.from("audit_logs") as any).insert({
      actor_profile_id: entry.actorProfileId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? {},
    });
    if (error) return;
  } catch {
    return;
  }
}
