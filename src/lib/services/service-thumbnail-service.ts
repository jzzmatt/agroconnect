import { randomUUID } from "node:crypto";
import {
  assertGeneratedThumbnail,
  assertThumbnailPreviewId,
  pendingServiceThumbnailPath,
  savedServiceThumbnailPath,
  serviceThumbnailPublicPath,
  type ServiceThumbnailSource,
} from "@/lib/services/service-thumbnail";

export interface SavedServiceThumbnail {
  storageKey: string;
  ownerProfileId: string;
  bytes: Buffer;
}

export interface ServiceThumbnailStore {
  findOwnedService(profileId: string, serviceId: string): Promise<ServiceThumbnailSource | null>;
  findServiceAccess(serviceId: string): Promise<{ ownerProfileId: string; status: string } | null>;
  putPending(path: string, bytes: Buffer): Promise<void>;
  readPending(path: string): Promise<Buffer | null>;
  remove(path: string): Promise<void>;
  putSaved(path: string, bytes: Buffer): Promise<void>;
  saveRecord(input: {
    profileId: string;
    serviceId: string;
    storageKey: string;
    fileSize: number;
    url: string;
  }): Promise<void>;
  readSaved(serviceId: string): Promise<SavedServiceThumbnail | null>;
}

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export function createServiceThumbnailService(deps: {
  store: ServiceThumbnailStore;
  generate: (source: ServiceThumbnailSource) => Promise<Buffer>;
  newId?: () => string;
}) {
  const newId = deps.newId ?? randomUUID;

  return {
    async generate(profileId: string, serviceId: string) {
      const service = await deps.store.findOwnedService(profileId, serviceId);
      if (!service || service.ownerProfileId !== profileId) fail("NOT_FOUND");
      const bytes = assertGeneratedThumbnail(await deps.generate(service));
      const previewId = assertThumbnailPreviewId(newId());
      await deps.store.putPending(pendingServiceThumbnailPath(profileId, serviceId, previewId), bytes);
      return {
        previewId,
        imageBase64: bytes.toString("base64"),
        mimeType: "image/jpeg" as const,
      };
    },

    async save(profileId: string, serviceId: string, previewId: string) {
      const service = await deps.store.findOwnedService(profileId, serviceId);
      if (!service || service.ownerProfileId !== profileId) fail("NOT_FOUND");
      const pendingPath = pendingServiceThumbnailPath(profileId, serviceId, previewId);
      const bytes = await deps.store.readPending(pendingPath);
      if (!bytes) fail("PREVIEW_NOT_FOUND");
      const image = assertGeneratedThumbnail(bytes);
      const storageKey = savedServiceThumbnailPath(profileId, serviceId);
      await deps.store.putSaved(storageKey, image);
      await deps.store.saveRecord({
        profileId,
        serviceId,
        storageKey,
        fileSize: image.length,
        url: serviceThumbnailPublicPath(serviceId),
      });
      await deps.store.remove(pendingPath);
      return { url: serviceThumbnailPublicPath(serviceId) };
    },

    async cancel(profileId: string, serviceId: string, previewId: string) {
      const service = await deps.store.findOwnedService(profileId, serviceId);
      if (!service || service.ownerProfileId !== profileId) fail("NOT_FOUND");
      await deps.store.remove(pendingServiceThumbnailPath(profileId, serviceId, previewId));
    },

    async read(serviceId: string, viewerProfileId: string | null) {
      const access = await deps.store.findServiceAccess(serviceId);
      if (!access) return null;
      const published = access.status === "published" || access.status === "active";
      if (!published && access.ownerProfileId !== viewerProfileId) return null;
      return deps.store.readSaved(serviceId);
    },
  };
}
