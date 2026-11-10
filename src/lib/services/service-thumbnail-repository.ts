import "server-only";

import { getMediaSupabaseClient } from "@/lib/media/db";
import { downloadStorageObject, removeStorageObject, uploadBufferToStorage } from "@/lib/media/supabase-storage-core";
import { SUPABASE_STORAGE_PROVIDER } from "@/lib/media/supabase-buckets";
import {
  SERVICE_THUMBNAILS_BUCKET,
  type ServiceThumbnailSource,
} from "@/lib/services/service-thumbnail";
import type { SavedServiceThumbnail, ServiceThumbnailStore } from "@/lib/services/service-thumbnail-service";

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
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

export function createSupabaseServiceThumbnailStore(): ServiceThumbnailStore {
  const db = getMediaSupabaseClient() as unknown as { from: (table: string) => any };

  async function loadService(serviceId: string) {
    const { data, error } = await db
      .from("services")
      .select("id,provider_id,title,short_description,description,status,province_id,municipality_id")
      .eq("id", serviceId)
      .maybeSingle();
    if (error) fail("STORAGE_UNAVAILABLE");
    if (!data) return null;
    const { data: provider } = await db
      .from("provider_profiles")
      .select("profile_id")
      .eq("id", data.provider_id)
      .maybeSingle();
    if (!provider?.profile_id) return null;
    return { data, ownerProfileId: String(provider.profile_id) };
  }

  return {
    async findOwnedService(profileId, serviceId) {
      const loaded = await loadService(serviceId);
      if (!loaded || loaded.ownerProfileId !== profileId) return null;
      const { data } = loaded;
      return {
        id: String(data.id),
        title: String(data.title),
        description: data.short_description
          ? String(data.short_description)
          : data.description
            ? String(data.description)
            : null,
        provinceName: await placeName(db, "provinces", data.province_id),
        municipalityName: await placeName(db, "municipalities", data.municipality_id),
        status: String(data.status),
        ownerProfileId: loaded.ownerProfileId,
      } satisfies ServiceThumbnailSource;
    },

    async findServiceAccess(serviceId) {
      const loaded = await loadService(serviceId);
      if (!loaded) return null;
      return { ownerProfileId: loaded.ownerProfileId, status: String(loaded.data.status) };
    },

    async putPending(path, bytes) {
      await uploadBufferToStorage({
        bucket: SERVICE_THUMBNAILS_BUCKET,
        storagePath: path,
        buffer: bytes,
        contentType: "image/jpeg",
      });
    },

    async readPending(path) {
      return downloadStorageObject(SERVICE_THUMBNAILS_BUCKET, path);
    },

    async remove(path) {
      await removeStorageObject(SERVICE_THUMBNAILS_BUCKET, path);
    },

    async putSaved(path, bytes) {
      await uploadBufferToStorage({
        bucket: SERVICE_THUMBNAILS_BUCKET,
        storagePath: path,
        buffer: bytes,
        contentType: "image/jpeg",
      });
    },

    async saveRecord(input) {
      const { data: existing } = await db
        .from("media_assets")
        .select("id,storage_key")
        .eq("owner_profile_id", input.profileId)
        .eq("entity_type", "service_image")
        .eq("entity_id", input.serviceId);
      for (const row of existing || []) {
        if (row.storage_key && row.storage_key !== input.storageKey) {
          await removeStorageObject(SERVICE_THUMBNAILS_BUCKET, row.storage_key);
        }
        await db.from("media_assets").delete().eq("id", row.id);
      }
      const { error } = await db.from("media_assets").insert({
        owner_profile_id: input.profileId,
        entity_type: "service_image",
        entity_id: input.serviceId,
        storage_provider: SUPABASE_STORAGE_PROVIDER,
        storage_key: input.storageKey,
        url: input.url,
        mime_type: "image/jpeg",
        file_size: input.fileSize,
        metadata: { role: "thumbnail" },
      });
      if (error) fail("THUMBNAIL_SAVE_FAILED");
    },

    async readSaved(serviceId) {
      const { data, error } = await db
        .from("media_assets")
        .select("storage_key,owner_profile_id,mime_type")
        .eq("entity_type", "service_image")
        .eq("entity_id", serviceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data?.storage_key) return null;
      const bytes = await downloadStorageObject(SERVICE_THUMBNAILS_BUCKET, data.storage_key);
      if (!bytes) return null;
      return {
        storageKey: String(data.storage_key),
        ownerProfileId: String(data.owner_profile_id),
        bytes,
      } satisfies SavedServiceThumbnail;
    },
  };
}
