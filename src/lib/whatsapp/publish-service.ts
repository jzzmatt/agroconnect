import { isPublicProductStatus } from "@/lib/products/publication";
import { isWhatsappGroupId } from "@/lib/integrations/waapi/groups";
import {
  buildProductWhatsappMessage,
  isHttpsMediaUrl,
  orderUrlForProduct,
} from "./product-message";
import { WhatsappServiceError, type PublicGroup } from "./types";

export const PUBLICATION_WINDOW_MS = 8_000;

export type PublicationStatus = "pending" | "processing" | "sent" | "failed" | "partially_sent";
export type TargetStatus = "pending" | "processing" | "sent" | "failed";
export type MediaStatus = "pending" | "sent" | "failed" | "skipped";

export interface PublicationTarget {
  id: string;
  groupId: string;
  groupName: string;
  status: TargetStatus;
  mediaStatus: MediaStatus;
  productImageStatus: MediaStatus;
  thumbnailStatus: MediaStatus;
  productImageMessageId: string | null;
  thumbnailMessageId: string | null;
  providerMessageId: string | null;
  errorCode: string | null;
  sentAt: string | null;
}

export interface PublicationRecord {
  id: string;
  userId: string;
  productId: string;
  connectionId: string;
  clientRequestId: string;
  status: PublicationStatus;
  createdAt: string;
  targets: PublicationTarget[];
}

export interface PublishableProduct {
  id: string;
  ownerUserId: string;
  title: string;
  description: string | null;
  price: number;
  province: string | null;
  municipality: string | null;
  locality: string | null;
  transportIncluded: boolean;
  status: string;
  availability: string;
  imageUrls: string[];
  productImageUrl: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  slug: string | null;
}

export interface PublishConnection {
  id: string;
  userId: string;
  instanceId: string;
  status: string;
  phone: string | null;
}

export interface GroupSender {
  sendText(instanceId: string, chatId: string, message: string): Promise<{ messageId: string | null }>;
  sendMedia(instanceId: string, chatId: string, mediaUrl: string, caption?: string): Promise<{ messageId: string | null }>;
}

export interface PublishStore {
  findConnection(userId: string): Promise<PublishConnection | null>;
  listSavedGroups(connectionId: string): Promise<PublicGroup[]>;
  findProduct(productId: string): Promise<PublishableProduct | null>;
  findPublicationByRequest(userId: string, clientRequestId: string): Promise<PublicationRecord | null>;
  latestPublicationAt(userId: string): Promise<string | null>;
  insertPublication(input: {
    userId: string;
    productId: string;
    connectionId: string;
    clientRequestId: string;
    groups: Array<{ id: string; name: string }>;
  }): Promise<PublicationRecord | "duplicate">;
  saveTarget(publicationId: string, target: PublicationTarget): Promise<void>;
  savePublicationStatus(publicationId: string, status: PublicationStatus): Promise<void>;
  claimForRetry(userId: string, publicationId: string): Promise<boolean>;
  findPublication(userId: string, publicationId: string): Promise<PublicationRecord | null>;
  audit(entry: {
    actorProfileId: string;
    action: string;
    entityId: string;
    metadata?: Record<string, string>;
  }): Promise<void>;
}

export function rollupPublicationStatus(targets: Array<{ status: TargetStatus }>): PublicationStatus {
  if (targets.length === 0) return "failed";
  const sent = targets.filter((target) => target.status === "sent").length;
  const failed = targets.filter((target) => target.status === "failed").length;
  if (sent + failed < targets.length) return "processing";
  if (sent === targets.length) return "sent";
  if (sent === 0) return "failed";
  return "partially_sent";
}

export function listingUrlForProduct(origin: string, slug: string | null): string | null {
  if (!slug) return null;
  return `${origin.replace(/\/$/, "")}/agrishopping/products/${encodeURIComponent(slug)}`;
}

export function publicProductMessage(origin: string, product: PublishableProduct): string {
  return buildProductWhatsappMessage({
    name: product.title,
    description: product.description,
    priceKz: product.price,
    province: product.province,
    municipality: product.municipality,
    locality: product.locality,
    transportIncluded: product.transportIncluded,
    videoUrl: isHttpsMediaUrl(product.videoUrl) ? product.videoUrl : null,
    orderUrl: orderUrlForProduct(origin, product.id),
    listingUrl: listingUrlForProduct(origin, product.slug),
  });
}

function assertOwnedGroups(saved: PublicGroup[], requested: string[]) {
  const unique = [...new Set(requested)];
  if (unique.length === 0 || unique.length > 30) {
    throw new WhatsappServiceError("INVALID_GROUP", 400);
  }
  const allowed = new Map(saved.filter((group) => group.saved).map((group) => [group.id, group.name]));
  const selected = unique.map((id) => {
    if (!isWhatsappGroupId(id) || !allowed.has(id)) {
      throw new WhatsappServiceError("GROUP_NOT_FOUND", 404);
    }
    return { id, name: allowed.get(id) || "Grupo" };
  });
  return selected;
}

function mediaRollup(productImageStatus: MediaStatus, thumbnailStatus: MediaStatus): MediaStatus {
  const statuses = [productImageStatus, thumbnailStatus];
  if (statuses.every((status) => status === "skipped")) return "skipped";
  if (statuses.some((status) => status === "failed" || status === "pending")) return statuses.some((status) => status === "failed") ? "failed" : "pending";
  return "sent";
}

async function sendTrackedImage(
  sender: GroupSender,
  instanceId: string,
  target: PublicationTarget,
  kind: "product" | "thumbnail",
  url: string | null,
  caption: string
): Promise<PublicationTarget> {
  const statusKey = kind === "product" ? "productImageStatus" : "thumbnailStatus";
  const messageKey = kind === "product" ? "productImageMessageId" : "thumbnailMessageId";
  if (target[statusKey] === "sent" || target[statusKey] === "skipped") return target;
  if (!isHttpsMediaUrl(url)) {
    return { ...target, [statusKey]: "skipped", mediaStatus: mediaRollup(
      kind === "product" ? "skipped" : target.productImageStatus,
      kind === "thumbnail" ? "skipped" : target.thumbnailStatus
    ) };
  }
  try {
    const sent = await sender.sendMedia(instanceId, target.groupId, url, caption);
    const productImageStatus = kind === "product" ? "sent" : target.productImageStatus;
    const thumbnailStatus = kind === "thumbnail" ? "sent" : target.thumbnailStatus;
    return {
      ...target,
      [statusKey]: "sent",
      [messageKey]: sent.messageId,
      mediaStatus: mediaRollup(productImageStatus, thumbnailStatus),
      providerMessageId: sent.messageId || target.providerMessageId,
    };
  } catch {
    const productImageStatus = kind === "product" ? "failed" : target.productImageStatus;
    const thumbnailStatus = kind === "thumbnail" ? "failed" : target.thumbnailStatus;
    return {
      ...target,
      status: "failed",
      [statusKey]: "failed",
      mediaStatus: mediaRollup(productImageStatus, thumbnailStatus),
      errorCode: "MEDIA_FAILED",
    };
  }
}

async function deliverGroup(
  sender: GroupSender,
  instanceId: string,
  target: PublicationTarget,
  product: PublishableProduct,
  message: string,
  now: string
): Promise<PublicationTarget> {
  const withProductImage = await sendTrackedImage(
    sender,
    instanceId,
    target,
    "product",
    product.productImageUrl || product.imageUrls.find(isHttpsMediaUrl) || null,
    message.slice(0, 1000)
  );
  if (withProductImage.productImageStatus === "failed") return withProductImage;
  const withThumbnail = await sendTrackedImage(
    sender,
    instanceId,
    withProductImage,
    "thumbnail",
    product.thumbnailUrl,
    message.slice(0, 1000)
  );
  if (withThumbnail.thumbnailStatus === "failed") return withThumbnail;
  try {
    const sent = await sender.sendText(instanceId, target.groupId, message);
    return {
      ...withThumbnail,
      status: "sent",
      providerMessageId: sent.messageId || withThumbnail.providerMessageId,
      errorCode: null,
      sentAt: now,
    };
  } catch {
    return {
      ...withThumbnail,
      status: "failed",
      providerMessageId: withThumbnail.providerMessageId,
      errorCode: "TEXT_FAILED",
    };
  }
}

export function createProductPublishService(deps: {
  store: PublishStore;
  sender: GroupSender;
  origin: string;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());

  async function runTargets(publication: PublicationRecord, product: PublishableProduct, connection: PublishConnection) {
    const message = publicProductMessage(deps.origin, product);
    const next: PublicationTarget[] = [];
    for (const target of publication.targets) {
      if (target.status === "sent") {
        next.push(target);
        continue;
      }
      const processing = { ...target, status: "processing" as const };
      await deps.store.saveTarget(publication.id, processing);
      const done = await deliverGroup(
        deps.sender,
        connection.instanceId,
        processing,
        product,
        message,
        now().toISOString()
      );
      await deps.store.saveTarget(publication.id, done);
      next.push(done);
    }
    const status = rollupPublicationStatus(next);
    await deps.store.savePublicationStatus(publication.id, status);
    await deps.store.audit({
      actorProfileId: publication.userId,
      action: "whatsapp.product.publish",
      entityId: publication.id,
      metadata: { status, productId: product.id },
    });
    return { ...publication, status, targets: next };
  }

  return {
    async preview(userId: string, productId: string) {
      const product = await deps.store.findProduct(productId);
      if (!product || product.ownerUserId !== userId) throw new WhatsappServiceError("NOT_FOUND", 404);
      const connection = await deps.store.findConnection(userId);
      const groups = connection ? await deps.store.listSavedGroups(connection.id) : [];
      return {
        message: publicProductMessage(deps.origin, product),
        product: {
          id: product.id,
          name: product.title,
          description: product.description,
          priceKz: product.price,
          location: [product.province, product.municipality, product.locality].filter(Boolean).join(" / "),
          transportIncluded: product.transportIncluded,
          imageUrl: product.productImageUrl || product.imageUrls.find(isHttpsMediaUrl) || null,
          thumbnailUrl: isHttpsMediaUrl(product.thumbnailUrl) ? product.thumbnailUrl : null,
          videoUrl: isHttpsMediaUrl(product.videoUrl) ? product.videoUrl : null,
          orderUrl: orderUrlForProduct(deps.origin, product.id),
          listingUrl:
            listingUrlForProduct(deps.origin, product.slug) ||
            orderUrlForProduct(deps.origin, product.id),
        },
        connection: connection
          ? { status: connection.status, phone: connection.phone }
          : { status: "not_connected", phone: null },
        groups: groups.filter((group) => group.saved),
      };
    },

    async publish(userId: string, input: { productId: string; groupIds: string[]; clientRequestId: string }) {
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
      if (!connection || connection.userId !== userId) throw new WhatsappServiceError("NOT_CONNECTED", 409);
      if (connection.status !== "connected") throw new WhatsappServiceError("NOT_CONNECTED", 409);

      const product = await deps.store.findProduct(input.productId);
      if (!product || product.ownerUserId !== userId) throw new WhatsappServiceError("NOT_FOUND", 404);
      if (!isPublicProductStatus(product.status)) throw new WhatsappServiceError("NOT_PUBLISHED", 409);
      if (product.availability === "out_of_stock") throw new WhatsappServiceError("UNAVAILABLE", 409);

      const saved = await deps.store.listSavedGroups(connection.id);
      const groups = assertOwnedGroups(saved, input.groupIds);
      const created = await deps.store.insertPublication({
        userId,
        productId: product.id,
        connectionId: connection.id,
        clientRequestId: input.clientRequestId,
        groups,
      });
      if (created === "duplicate") {
        const raced = await deps.store.findPublicationByRequest(userId, input.clientRequestId);
        if (raced) return raced;
        throw new WhatsappServiceError("RATE_LIMITED", 429);
      }
      return runTargets(created, product, connection);
    },

    async retry(userId: string, publicationId: string) {
      const publication = await deps.store.findPublication(userId, publicationId);
      if (!publication || publication.userId !== userId) throw new WhatsappServiceError("NOT_FOUND", 404);
      const connection = await deps.store.findConnection(userId);
      if (!connection || connection.id !== publication.connectionId || connection.status !== "connected") {
        throw new WhatsappServiceError("NOT_CONNECTED", 409);
      }
      const product = await deps.store.findProduct(publication.productId);
      if (!product || product.ownerUserId !== userId) throw new WhatsappServiceError("NOT_FOUND", 404);
      const failed = publication.targets.some((target) => target.status === "failed");
      if (!failed) return publication;
      const claimed = await deps.store.claimForRetry(userId, publicationId);
      if (!claimed) throw new WhatsappServiceError("RATE_LIMITED", 429, PUBLICATION_WINDOW_MS);
      return runTargets(publication, product, connection);
    },
  };
}
