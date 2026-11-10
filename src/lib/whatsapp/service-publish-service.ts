import { isWhatsappGroupId } from "@/lib/integrations/waapi/groups";
import { durableWhatsappLink } from "@/lib/whatsapp/product-message";
import { PUBLICATION_WINDOW_MS, rollupPublicationStatus } from "@/lib/whatsapp/publish-service";
import { serviceBookingUrl, servicePageUrl, buildServiceWhatsappMessage } from "@/lib/whatsapp/service-message";
import { WhatsappServiceError, type PublicGroup } from "@/lib/whatsapp/types";

export type ServiceShareStatus = "pending" | "processing" | "sent" | "failed" | "partially_sent";
export type ServiceShareTargetStatus = "pending" | "processing" | "sent" | "failed";

const PUBLISHED_SERVICE_STATUSES = new Set(["published", "active"]);

export interface ServiceShareTarget {
  id: string;
  groupId: string;
  groupName: string;
  status: ServiceShareTargetStatus;
  providerMessageId: string | null;
  errorCode: string | null;
  sentAt: string | null;
}

export interface ServiceShareRecord {
  id: string;
  userId: string;
  serviceId: string;
  connectionId: string;
  clientRequestId: string;
  status: ServiceShareStatus;
  createdAt: string;
  targets: ServiceShareTarget[];
}

export interface ShareableService {
  id: string;
  ownerUserId: string;
  title: string;
  slug: string;
  providerName: string | null;
  description: string | null;
  price: number;
  currency: string;
  pricingType: string;
  provinceName: string | null;
  municipalityName: string | null;
  status: string;
  thumbnailUrl?: string | null;
}

export interface ServiceShareConnection {
  id: string;
  userId: string;
  instanceId: string;
  status: string;
  phone: string | null;
}

export interface ServiceShareStore {
  findConnection(userId: string): Promise<ServiceShareConnection | null>;
  listSavedGroups(connectionId: string): Promise<PublicGroup[]>;
  findService(serviceId: string): Promise<ShareableService | null>;
  findPublicationByRequest(userId: string, clientRequestId: string): Promise<ServiceShareRecord | null>;
  latestPublicationAt(userId: string): Promise<string | null>;
  insertPublication(input: {
    userId: string;
    serviceId: string;
    connectionId: string;
    clientRequestId: string;
    groups: Array<{ id: string; name: string }>;
  }): Promise<ServiceShareRecord | "duplicate">;
  saveTarget(publicationId: string, target: ServiceShareTarget): Promise<void>;
  savePublicationStatus(publicationId: string, status: ServiceShareStatus): Promise<void>;
  claimForRetry(userId: string, publicationId: string): Promise<boolean>;
  findPublication(userId: string, publicationId: string): Promise<ServiceShareRecord | null>;
  audit(entry: {
    actorProfileId: string;
    action: string;
    entityId: string;
    metadata?: Record<string, string>;
  }): Promise<void>;
}

export interface ServiceTextSender {
  sendText(instanceId: string, chatId: string, message: string): Promise<{ messageId: string | null }>;
  sendMedia?(
    instanceId: string,
    chatId: string,
    mediaUrl: string,
    caption: string
  ): Promise<{ messageId: string | null }>;
}

function assertOwnedGroups(saved: PublicGroup[], requested: string[]) {
  const unique = [...new Set(requested)];
  if (unique.length === 0 || unique.length > 30) {
    throw new WhatsappServiceError("INVALID_GROUP", 400);
  }
  const allowed = new Map(saved.filter((group) => group.saved).map((group) => [group.id, group.name]));
  return unique.map((id) => {
    if (!isWhatsappGroupId(id) || !allowed.has(id)) {
      throw new WhatsappServiceError("GROUP_NOT_FOUND", 404);
    }
    return { id, name: allowed.get(id) || "Grupo" };
  });
}

function requireShareableService(service: ShareableService | null, userId: string): ShareableService {
  if (!service || service.ownerUserId !== userId) throw new WhatsappServiceError("NOT_FOUND", 404);
  if (!PUBLISHED_SERVICE_STATUSES.has(service.status)) {
    throw new WhatsappServiceError("NOT_PUBLISHED", 409);
  }
  return service;
}

export function serviceShareMessage(origin: string, service: ShareableService): string {
  return buildServiceWhatsappMessage({
    title: service.title,
    providerName: service.providerName,
    price: service.price,
    currency: service.currency,
    pricingType: service.pricingType,
    description: service.description,
    province: service.provinceName,
    municipality: service.municipalityName,
    bookingUrl: serviceBookingUrl(origin, service.slug),
    serviceUrl: servicePageUrl(origin, service.slug),
  });
}

export function createServicePublishService(deps: {
  store: ServiceShareStore;
  sender: ServiceTextSender;
  origin: string;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());

  async function runTargets(
    publication: ServiceShareRecord,
    service: ShareableService,
    connection: ServiceShareConnection
  ) {
    const message = serviceShareMessage(deps.origin, service);
    const thumbnailUrl = durableWhatsappLink(
      service.thumbnailUrl?.startsWith("http")
        ? service.thumbnailUrl
        : service.thumbnailUrl
          ? `${deps.origin}${service.thumbnailUrl}`
          : null
    );
    const next: ServiceShareTarget[] = [];
    for (const target of publication.targets) {
      if (target.status === "sent") {
        next.push(target);
        continue;
      }
      const processing = { ...target, status: "processing" as const };
      await deps.store.saveTarget(publication.id, processing);
      try {
        let sent: { messageId: string | null } | null = null;
        if (thumbnailUrl && deps.sender.sendMedia) {
          try {
            sent = await deps.sender.sendMedia(connection.instanceId, target.groupId, thumbnailUrl, message.slice(0, 1000));
          } catch (error) {
            console.error("[service whatsapp] thumbnail was not delivered", error instanceof Error ? error.message : "MEDIA_FAILED");
          }
        }
        if (!sent) sent = await deps.sender.sendText(connection.instanceId, target.groupId, message);
        const done: ServiceShareTarget = {
          ...processing,
          status: "sent",
          providerMessageId: sent.messageId,
          errorCode: null,
          sentAt: now().toISOString(),
        };
        await deps.store.saveTarget(publication.id, done);
        next.push(done);
      } catch (error) {
        console.error("[service whatsapp] message was not delivered", error instanceof Error ? error.message : "TEXT_FAILED");
        const done: ServiceShareTarget = {
          ...processing,
          status: "failed",
          errorCode: "TEXT_FAILED",
        };
        await deps.store.saveTarget(publication.id, done);
        next.push(done);
      }
    }
    const status = rollupPublicationStatus(next);
    await deps.store.savePublicationStatus(publication.id, status);
    await deps.store.audit({
      actorProfileId: publication.userId,
      action: "whatsapp.service.publish",
      entityId: publication.id,
      metadata: { status, serviceId: service.id },
    });
    return { ...publication, status, targets: next };
  }

  return {
    async preview(userId: string, serviceId: string) {
      const service = requireShareableService(await deps.store.findService(serviceId), userId);
      const connection = await deps.store.findConnection(userId);
      const groups = connection ? await deps.store.listSavedGroups(connection.id) : [];
      return {
        message: serviceShareMessage(deps.origin, service),
        service: {
          id: service.id,
          title: service.title,
          providerName: service.providerName,
          price: service.price,
          currency: service.currency,
          pricingType: service.pricingType,
          bookingUrl: serviceBookingUrl(deps.origin, service.slug),
          serviceUrl: servicePageUrl(deps.origin, service.slug),
        },
        connection: connection
          ? { status: connection.status, phone: connection.phone }
          : { status: "not_connected", phone: null },
        groups: groups.filter((group) => group.saved),
      };
    },

    async publish(
      userId: string,
      input: { serviceId: string; groupIds: string[]; clientRequestId: string }
    ) {
      if (!/^[A-Za-z0-9_-]{16,80}$/.test(input.clientRequestId)) {
        throw new WhatsappServiceError("INVALID_REQUEST", 400);
      }
      const existing = await deps.store.findPublicationByRequest(userId, input.clientRequestId);
      if (existing) return existing;

      const latest = await deps.store.latestPublicationAt(userId);
      if (latest && now().getTime() - Date.parse(latest) < PUBLICATION_WINDOW_MS) {
        throw new WhatsappServiceError("RATE_LIMITED", 429, PUBLICATION_WINDOW_MS);
      }

      const connection = await deps.store.findConnection(userId);
      if (!connection || connection.userId !== userId || connection.status !== "connected") {
        throw new WhatsappServiceError("NOT_CONNECTED", 409);
      }
      const service = requireShareableService(await deps.store.findService(input.serviceId), userId);
      const groups = assertOwnedGroups(await deps.store.listSavedGroups(connection.id), input.groupIds);
      const created = await deps.store.insertPublication({
        userId,
        serviceId: service.id,
        connectionId: connection.id,
        clientRequestId: input.clientRequestId,
        groups,
      });
      if (created === "duplicate") {
        const raced = await deps.store.findPublicationByRequest(userId, input.clientRequestId);
        if (raced) return raced;
        throw new WhatsappServiceError("RATE_LIMITED", 429);
      }
      return runTargets(created, service, connection);
    },

    async retry(userId: string, publicationId: string) {
      const publication = await deps.store.findPublication(userId, publicationId);
      if (!publication || publication.userId !== userId) throw new WhatsappServiceError("NOT_FOUND", 404);
      const connection = await deps.store.findConnection(userId);
      if (!connection || connection.id !== publication.connectionId || connection.status !== "connected") {
        throw new WhatsappServiceError("NOT_CONNECTED", 409);
      }
      const service = requireShareableService(await deps.store.findService(publication.serviceId), userId);
      if (!publication.targets.some((target) => target.status === "failed")) return publication;
      const claimed = await deps.store.claimForRetry(userId, publicationId);
      if (!claimed) throw new WhatsappServiceError("RATE_LIMITED", 429, PUBLICATION_WINDOW_MS);
      return runTargets(publication, service, connection);
    },
  };
}
