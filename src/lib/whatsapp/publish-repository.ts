import { randomUUID } from "node:crypto";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { ProductMediaService } from "@/lib/services/product-media-service";
import { ProductVideoService } from "@/lib/services/product-video-service";
import { isHttpsMediaUrl } from "./product-message";
import {
  type MediaStatus,
  type PublicationRecord,
  type PublicationStatus,
  type PublicationTarget,
  type PublishStore,
  type TargetStatus,
} from "./publish-service";
import { WhatsappServiceError, type PublicGroup } from "./types";

function client() {
  const supabase = tryCreateAdminSupabaseClient();
  if (!supabase) throw new WhatsappServiceError("NOT_CONFIGURED", 503);
  return supabase as unknown as { from: (table: string) => any };
}

function targetFromRow(row: Record<string, unknown>): PublicationTarget {
  return {
    id: String(row.id),
    groupId: String(row.whatsapp_group_id),
    groupName: String(row.group_name),
    status: row.status as TargetStatus,
    mediaStatus: row.media_status as MediaStatus,
    providerMessageId: typeof row.provider_message_id === "string" ? row.provider_message_id : null,
    errorCode: typeof row.error_code === "string" ? row.error_code : null,
    sentAt: typeof row.sent_at === "string" ? row.sent_at : null,
  };
}

async function withTargets(
  db: { from: (table: string) => any },
  row: Record<string, unknown>
): Promise<PublicationRecord> {
  const { data, error } = await db
    .from("whatsapp_product_publication_targets")
    .select("*")
    .eq("publication_id", row.id)
    .order("created_at", { ascending: true });
  if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
  return {
    id: String(row.id),
    userId: String(row.user_id),
    productId: String(row.product_id),
    connectionId: String(row.connection_id),
    clientRequestId: String(row.client_request_id),
    status: row.status as PublicationStatus,
    createdAt: String(row.created_at),
    targets: Array.isArray(data) ? data.map(targetFromRow) : [],
  };
}

async function httpsImages(rows: Record<string, unknown>[]): Promise<string[]> {
  const urls: string[] = [];
  for (const row of rows.slice(0, 4)) {
    const resolved = await ProductMediaService.resolveImageDisplayUrl(row as never);
    if (isHttpsMediaUrl(resolved)) urls.push(resolved);
    else if (isHttpsMediaUrl(typeof row.url === "string" ? row.url : null)) urls.push(row.url as string);
  }
  return urls;
}

export function createSupabasePublishStore(): PublishStore {
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
      };
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

    async findProduct(productId) {
      const { data, error } = await db
        .from("products")
        .select("id,seller_id,title,slug,description,price,status,availability_status,transport_included,metadata,primary_image_url")
        .eq("id", productId)
        .maybeSingle();
      if (error || !data) return null;
      const { data: seller } = await db
        .from("provider_profiles")
        .select("profile_id")
        .eq("id", data.seller_id)
        .maybeSingle();
      if (!seller?.profile_id) return null;
      const { data: images } = await db
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true });
      const { data: video } = await db
        .from("product_videos")
        .select("*")
        .eq("product_id", productId)
        .neq("status", "deleted")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const location = (data.metadata as { location?: Record<string, string> } | null)?.location;
      const imageUrls = await httpsImages((images || []) as Record<string, unknown>[]);
      if (imageUrls.length === 0 && isHttpsMediaUrl(data.primary_image_url)) imageUrls.push(data.primary_image_url);
      const playback = video ? await ProductVideoService.resolvePlaybackUrl(video) : null;
      return {
        id: String(data.id),
        ownerUserId: String(seller.profile_id),
        title: String(data.title),
        description: data.description ? String(data.description) : null,
        price: Number(data.price),
        province: location?.province_name || null,
        municipality: location?.municipality_name || null,
        locality: location?.locality_name || null,
        transportIncluded: Boolean(data.transport_included),
        status: String(data.status),
        availability: String(data.availability_status || ""),
        imageUrls,
        videoUrl: isHttpsMediaUrl(playback) ? playback : null,
        slug: data.slug ? String(data.slug) : null,
      };
    },

    async findPublicationByRequest(userId, clientRequestId) {
      const { data, error } = await db
        .from("whatsapp_product_publications")
        .select("*")
        .eq("user_id", userId)
        .eq("client_request_id", clientRequestId)
        .maybeSingle();
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return data ? withTargets(db, data) : null;
    },

    async latestPublicationAt(userId) {
      const { data, error } = await db
        .from("whatsapp_product_publications")
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
        .from("whatsapp_product_publications")
        .insert({
          user_id: input.userId,
          product_id: input.productId,
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
        media_status: "pending",
      }));
      const inserted = await db.from("whatsapp_product_publication_targets").insert(targets).select("*");
      if (inserted.error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return withTargets(db, data);
    },

    async saveTarget(publicationId, target) {
      const { error } = await db
        .from("whatsapp_product_publication_targets")
        .update({
          status: target.status,
          media_status: target.mediaStatus,
          provider_message_id: target.providerMessageId,
          error_code: target.errorCode,
          sent_at: target.sentAt,
        })
        .eq("publication_id", publicationId)
        .eq("id", target.id);
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
    },

    async savePublicationStatus(publicationId, status) {
      const { error } = await db
        .from("whatsapp_product_publications")
        .update({ status })
        .eq("id", publicationId);
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
    },

    async claimForRetry(userId, publicationId) {
      const { data, error } = await db
        .from("whatsapp_product_publications")
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
          entity_type: "whatsapp_product_publication",
          entity_id: entry.entityId,
          metadata: entry.metadata ?? {},
        })
        .then(() => undefined, () => undefined);
    },

    async findPublication(userId, publicationId) {
      const { data, error } = await db
        .from("whatsapp_product_publications")
        .select("*")
        .eq("id", publicationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new WhatsappServiceError("PROVIDER_ERROR", 502);
      return data ? withTargets(db, data) : null;
    },
  };
}
