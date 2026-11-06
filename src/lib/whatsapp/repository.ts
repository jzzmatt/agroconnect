import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  WhatsappServiceError,
  type ConnectionPatch,
  type ConnectionRecord,
  type DiscoveredGroup,
  type SavedGroup,
  type StoredConnectionStatus,
  type WhatsappStore,
} from "./types";

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function connectionFromRow(row: Row): ConnectionRecord {
  const status = row.connection_status;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    businessId: text(row.business_id),
    instanceId: String(row.waapi_instance_id),
    webhookToken: String(row.webhook_token),
    phone: text(row.connected_phone_number),
    status: (typeof status === "string" ? status : "disconnected") as StoredConnectionStatus,
    qrVersion: typeof row.qr_version === "number" ? row.qr_version : 0,
    qrRequestedAt: text(row.qr_requested_at),
    chatsRequestedAt: text(row.chats_requested_at),
    statusCheckedAt: text(row.status_checked_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastConnectedAt: text(row.last_connected_at),
  };
}

function groupFromRow(row: Row): SavedGroup {
  return {
    id: String(row.id),
    connectionId: String(row.connection_id),
    whatsappGroupId: String(row.whatsapp_group_id),
    name: String(row.group_name),
    imageUrl: text(row.group_image_url),
    isActive: row.is_active !== false,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function patchToRow(patch: ConnectionPatch): Row {
  const row: Row = {};
  if (patch.instanceId !== undefined) row.waapi_instance_id = patch.instanceId;
  if (patch.status !== undefined) row.connection_status = patch.status;
  if (patch.phone !== undefined) row.connected_phone_number = patch.phone;
  if (patch.qrVersion !== undefined) row.qr_version = patch.qrVersion;
  if (patch.qrRequestedAt !== undefined) row.qr_requested_at = patch.qrRequestedAt;
  if (patch.chatsRequestedAt !== undefined) row.chats_requested_at = patch.chatsRequestedAt;
  if (patch.statusCheckedAt !== undefined) row.status_checked_at = patch.statusCheckedAt;
  if (patch.lastConnectedAt !== undefined) row.last_connected_at = patch.lastConnectedAt;
  return row;
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export function createSupabaseWhatsappStore(): WhatsappStore {
  const supabase = tryCreateAdminSupabaseClient();
  if (!supabase) throw new WhatsappServiceError("NOT_CONFIGURED", 503);
  const db = supabase as unknown as {
    from: (table: string) => any;
  };

  return {
    async findConnectionByUser(userId) {
      const { data, error } = await db
        .from("whatsapp_connections")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return data ? connectionFromRow(data) : null;
    },

    async findConnectionByWebhookToken(token) {
      const { data, error } = await db
        .from("whatsapp_connections")
        .select("*")
        .eq("webhook_token", token)
        .maybeSingle();
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return data ? connectionFromRow(data) : null;
    },

    async findBusinessId(userId) {
      const { data, error } = await db
        .from("provider_profiles")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle();
      if (error) return null;
      return data?.id ? String(data.id) : null;
    },

    async insertConnection(input) {
      const { data, error } = await db
        .from("whatsapp_connections")
        .insert({
          user_id: input.userId,
          business_id: input.businessId,
          waapi_instance_id: input.instanceId,
          webhook_token: input.webhookToken,
          connection_status: "disconnected",
        })
        .select("*")
        .single();
      if (isUniqueViolation(error)) throw new WhatsappServiceError("DUPLICATE_CONNECTION", 409);
      if (error || !data) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return connectionFromRow(data);
    },

    async updateForUser(id, userId, patch) {
      const { data, error } = await db
        .from("whatsapp_connections")
        .update(patchToRow(patch))
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .maybeSingle();
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return data ? connectionFromRow(data) : null;
    },

    async updateById(id, patch) {
      const { data, error } = await db
        .from("whatsapp_connections")
        .update(patchToRow(patch))
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return data ? connectionFromRow(data) : null;
    },

    async listActiveGroups(connectionId) {
      const { data, error } = await db
        .from("whatsapp_saved_groups")
        .select("*")
        .eq("connection_id", connectionId)
        .eq("is_active", true)
        .order("group_name", { ascending: true });
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return Array.isArray(data) ? data.map(groupFromRow) : [];
    },

    async countActiveGroups(connectionId) {
      const { count, error } = await db
        .from("whatsapp_saved_groups")
        .select("id", { count: "exact", head: true })
        .eq("connection_id", connectionId)
        .eq("is_active", true);
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return count ?? 0;
    },

    async upsertGroup(connectionId, group: DiscoveredGroup) {
      const { data, error } = await db
        .from("whatsapp_saved_groups")
        .upsert(
          {
            connection_id: connectionId,
            whatsapp_group_id: group.id,
            group_name: group.name,
            group_image_url: group.imageUrl,
            is_active: true,
          },
          { onConflict: "connection_id,whatsapp_group_id" }
        )
        .select("*")
        .single();
      if (error || !data) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return groupFromRow(data);
    },

    async deactivateGroup(connectionId, groupId) {
      const { data, error } = await db
        .from("whatsapp_saved_groups")
        .update({ is_active: false })
        .eq("connection_id", connectionId)
        .eq("whatsapp_group_id", groupId)
        .eq("is_active", true)
        .select("id")
        .maybeSingle();
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return Boolean(data?.id);
    },

    async audit(entry) {
      await db
        .from("audit_logs")
        .insert({
          actor_profile_id: entry.actorProfileId,
          action: entry.action,
          entity_type: "whatsapp_connection",
          entity_id: entry.entityId,
          metadata: entry.metadata ?? {},
        })
        .then(() => undefined, () => undefined);
    },
  };
}
