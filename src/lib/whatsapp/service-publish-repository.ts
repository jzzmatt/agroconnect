import { randomUUID } from "node:crypto";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  ServiceShareConnection,
  ServiceShareRecord,
  ServiceShareStatus,
  ServiceShareStore,
  ServiceShareTarget,
  ServiceShareTargetStatus,
  ShareableService,
} from "@/lib/whatsapp/service-publish-service";
import { serviceThumbnailPublicPath } from "@/lib/services/service-thumbnail";
import { WhatsappServiceError, type PublicGroup } from "@/lib/whatsapp/types";

function client() {
  const supabase = tryCreateAdminSupabaseClient();
  if (!supabase) throw new WhatsappServiceError("NOT_CONFIGURED", 503);
  return supabase as unknown as { from: (table: string) => any };
}

function targetFromRow(row: Record<string, unknown>): ServiceShareTarget {
  return {
    id: String(row.id),
    groupId: String(row.whatsapp_group_id),
    groupName: String(row.group_name),
    status: row.status as ServiceShareTargetStatus,
    providerMessageId: typeof row.provider_message_id === "string" ? row.provider_message_id : null,
    errorCode: typeof row.error_code === "string" ? row.error_code : null,
    sentAt: typeof row.sent_at === "string" ? row.sent_at : null,
  };
}

async function withTargets(
  db: { from: (table: string) => any },
  row: Record<string, unknown>
): Promise<ServiceShareRecord> {
  const { data, error } = await db
    .from("whatsapp_service_publication_targets")
    .select("*")
    .eq("publication_id", row.id)
    .order("created_at", { ascending: true });
  if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
  return {
    id: String(row.id),
    userId: String(row.user_id),
    serviceId: String(row.service_id),
    connectionId: String(row.connection_id),
    clientRequestId: String(row.client_request_id),
    status: row.status as ServiceShareStatus,
    createdAt: String(row.created_at),
    targets: Array.isArray(data) ? data.map(targetFromRow) : [],
  };
}

async function placeName(
  db: { from: (table: string) => any },
  table: "provinces" | "municipalities",
  id: unknown
): Promise<string | null> {
  if (!id) return null;
  const { data } = await db.from(table).select("name").eq("id", id).maybeSingle();
  return data?.name ? String(data.name) : null;
}

export function createSupabaseServicePublishStore(): ServiceShareStore {
  const db = client();
  return {
    async findConnection(userId) {
      const { data, error } = await db
        .from("whatsapp_connections")
        .select("id,user_id,waapi_instance_id,connection_status,connected_phone_number")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      if (!data) return null;
      return {
        id: String(data.id),
        userId: String(data.user_id),
        instanceId: String(data.waapi_instance_id),
        status: String(data.connection_status),
        phone: data.connected_phone_number ? String(data.connected_phone_number) : null,
      } satisfies ServiceShareConnection;
    },

    async listSavedGroups(connectionId) {
      const { data, error } = await db
        .from("whatsapp_saved_groups")
        .select("whatsapp_group_id,group_name,group_image_url,is_active")
        .eq("connection_id", connectionId)
        .eq("is_active", true);
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return ((data || []) as Record<string, unknown>[]).map(
        (row): PublicGroup => ({
          id: String(row.whatsapp_group_id),
          name: String(row.group_name),
          imageUrl: typeof row.group_image_url === "string" ? row.group_image_url : null,
          saved: true,
          available: true,
        })
      );
    },

    async findService(serviceId) {
      const { data, error } = await db
        .from("services")
        .select(
          "id,provider_id,title,slug,short_description,description,pricing_type,price,currency,status,province_id,municipality_id"
        )
        .eq("id", serviceId)
        .maybeSingle();
      if (error || !data) return null;
      const { data: provider } = await db
        .from("provider_profiles")
        .select("profile_id,business_name")
        .eq("id", data.provider_id)
        .maybeSingle();
      if (!provider?.profile_id) return null;
      const { data: thumbnail } = await db
        .from("media_assets")
        .select("id")
        .eq("entity_type", "service_image")
        .eq("entity_id", data.id)
        .limit(1)
        .maybeSingle();
      return {
        id: String(data.id),
        ownerUserId: String(provider.profile_id),
        title: String(data.title),
        slug: String(data.slug),
        providerName: provider.business_name ? String(provider.business_name) : null,
        description: data.short_description
          ? String(data.short_description)
          : data.description
            ? String(data.description)
            : null,
        price: Number(data.price ?? 0),
        currency: String(data.currency || "AOA"),
        pricingType: String(data.pricing_type || "fixed"),
        provinceName: await placeName(db, "provinces", data.province_id),
        municipalityName: await placeName(db, "municipalities", data.municipality_id),
        status: String(data.status),
        thumbnailUrl: thumbnail?.id ? serviceThumbnailPublicPath(String(data.id)) : null,
      } satisfies ShareableService;
    },

    async findPublicationByRequest(userId, clientRequestId) {
      const { data, error } = await db
        .from("whatsapp_service_publications")
        .select("*")
        .eq("user_id", userId)
        .eq("client_request_id", clientRequestId)
        .maybeSingle();
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return data ? withTargets(db, data) : null;
    },

    async latestPublicationAt(userId) {
      const { data, error } = await db
        .from("whatsapp_service_publications")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return data?.created_at ? String(data.created_at) : null;
    },

    async insertPublication(input) {
      const { data, error } = await db
        .from("whatsapp_service_publications")
        .insert({
          user_id: input.userId,
          service_id: input.serviceId,
          connection_id: input.connectionId,
          client_request_id: input.clientRequestId,
          status: "processing",
        })
        .select("*")
        .single();
      if (error?.code === "23505") return "duplicate";
      if (error || !data) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      const targets = input.groups.map((group) => ({
        id: randomUUID(),
        publication_id: data.id,
        connection_id: input.connectionId,
        whatsapp_group_id: group.id,
        group_name: group.name,
        status: "pending",
      }));
      const inserted = await db.from("whatsapp_service_publication_targets").insert(targets).select("*");
      if (inserted.error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return withTargets(db, data);
    },

    async saveTarget(publicationId, target) {
      const { error } = await db
        .from("whatsapp_service_publication_targets")
        .update({
          status: target.status,
          provider_message_id: target.providerMessageId,
          error_code: target.errorCode,
          sent_at: target.sentAt,
        })
        .eq("publication_id", publicationId)
        .eq("id", target.id);
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
    },

    async savePublicationStatus(publicationId, status) {
      const { error } = await db.from("whatsapp_service_publications").update({ status }).eq("id", publicationId);
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
    },

    async claimForRetry(userId, publicationId) {
      const { data, error } = await db
        .from("whatsapp_service_publications")
        .update({ status: "processing" })
        .eq("id", publicationId)
        .eq("user_id", userId)
        .in("status", ["failed", "partially_sent"])
        .select("id");
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return Array.isArray(data) && data.length > 0;
    },

    async audit(entry) {
      await db
        .from("audit_logs")
        .insert({
          actor_profile_id: entry.actorProfileId,
          action: entry.action,
          entity_type: "whatsapp_service_publication",
          entity_id: entry.entityId,
          metadata: entry.metadata ?? {},
        })
        .then(() => undefined, () => undefined);
    },

    async findPublication(userId, publicationId) {
      const { data, error } = await db
        .from("whatsapp_service_publications")
        .select("*")
        .eq("id", publicationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return data ? withTargets(db, data) : null;
    },
  };
}
