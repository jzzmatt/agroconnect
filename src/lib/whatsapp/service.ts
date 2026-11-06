import { randomBytes } from "node:crypto";
import { isWhatsappGroupId } from "@/lib/integrations/waapi/groups";
import { authorizeWaapiWebhook, parseWaapiWebhook } from "@/lib/integrations/waapi/webhooks";
import {
  CHAT_REQUEST_WINDOW_MS,
  QR_REQUEST_WINDOW_MS,
  STATUS_POLL_WINDOW_MS,
  mergeGroups,
  needsPhoneLookup,
  reduceConnection,
  retryAfterMs,
  toPublicConnection,
} from "./model";
import {
  WhatsappServiceError,
  type ConnectionPatch,
  type ConnectionRecord,
  type PublicConnection,
  type PublicGroup,
  type WaapiGateway,
  type WhatsappStore,
} from "./types";

export interface WhatsappServiceDeps {
  store: WhatsappStore;
  gateway: WaapiGateway;
  webhookUrlFor: (token: string) => string;
  now?: () => Date;
  createToken?: () => string;
}

export interface ConnectResult {
  connection: PublicConnection;
  qrCode: string | null;
  pending: boolean;
}

function instanceName(userId: string): string {
  return `agroconnect-${userId.replace(/-/g, "").slice(0, 12)}`;
}

function mapGatewayError(error: unknown): WhatsappServiceError {
  if (error instanceof WhatsappServiceError) return error;
  const status = typeof (error as { status?: unknown })?.status === "number"
    ? (error as { status: number }).status
    : 502;
  if (status === 401 || status === 403) return new WhatsappServiceError("PROVIDER_AUTH", 502);
  if (status === 402) return new WhatsappServiceError("PROVIDER_PAYMENT", 402);
  if (status === 404) return new WhatsappServiceError("INSTANCE_MISSING", 404);
  if (status === 409) return new WhatsappServiceError("PROVIDER_CONFLICT", 409);
  if (status === 422) return new WhatsappServiceError("PROVIDER_REJECTED", 422);
  if (status === 429) return new WhatsappServiceError("RATE_LIMITED", 429);
  if (status === 503) return new WhatsappServiceError("PROVIDER_UNAVAILABLE", 503);
  return new WhatsappServiceError("PROVIDER_ERROR", 502);
}

export function createWhatsappService(deps: WhatsappServiceDeps) {
  const now = deps.now ?? (() => new Date());
  const createToken = deps.createToken ?? (() => randomBytes(32).toString("base64url"));
  const { store, gateway } = deps;

  async function present(row: ConnectionRecord | null): Promise<PublicConnection> {
    if (!row) return toPublicConnection(null, 0);
    const count = await store.countActiveGroups(row.id);
    return toPublicConnection(row, count);
  }

  async function requireOwn(userId: string): Promise<ConnectionRecord> {
    const row = await store.findConnectionByUser(userId);
    if (!row || row.userId !== userId) throw new WhatsappServiceError("NOT_FOUND", 404);
    return row;
  }

  async function write(
    row: ConnectionRecord,
    userId: string,
    patch: ConnectionPatch
  ): Promise<ConnectionRecord> {
    const updated = await store.updateForUser(row.id, userId, patch);
    if (!updated || updated.userId !== userId) {
      throw new WhatsappServiceError("OWNERSHIP_REQUIRED", 403);
    }
    return updated;
  }

  async function provision(userId: string): Promise<ConnectionRecord> {
    const token = createToken();
    if (token.length < 32) throw new WhatsappServiceError("NOT_CONFIGURED", 503);
    const webhookUrl = deps.webhookUrlFor(token);
    const businessId = await store.findBusinessId(userId);
    let created: { id: string };
    try {
      created = await gateway.createInstance({ name: instanceName(userId), webhookUrl });
    } catch (error) {
      throw mapGatewayError(error);
    }
    try {
      return await store.insertConnection({
        userId,
        businessId,
        instanceId: created.id,
        webhookToken: token,
      });
    } catch (error) {
      await gateway.deleteInstance(created.id).catch(() => undefined);
      if (error instanceof WhatsappServiceError && error.code === "DUPLICATE_CONNECTION") {
        const existing = await store.findConnectionByUser(userId);
        if (existing) return existing;
      }
      throw error instanceof WhatsappServiceError
        ? error
        : new WhatsappServiceError("PROVIDER_ERROR", 502);
    }
  }

  async function replaceInstance(row: ConnectionRecord): Promise<ConnectionRecord> {
    let created: { id: string };
    try {
      created = await gateway.createInstance({
        name: instanceName(row.userId),
        webhookUrl: deps.webhookUrlFor(row.webhookToken),
      });
    } catch (error) {
      throw mapGatewayError(error);
    }
    const updated = await store.updateForUser(row.id, row.userId, {
      instanceId: created.id,
      status: "disconnected",
      phone: null,
    });
    if (!updated) {
      await gateway.deleteInstance(created.id).catch(() => undefined);
      throw new WhatsappServiceError("OWNERSHIP_REQUIRED", 403);
    }
    return updated;
  }

  async function ensureInstance(userId: string): Promise<ConnectionRecord> {
    const existing = await store.findConnectionByUser(userId);
    if (!existing) return provision(userId);
    if (existing.userId !== userId) throw new WhatsappServiceError("OWNERSHIP_REQUIRED", 403);
    try {
      await gateway.updateWebhook(existing.instanceId, deps.webhookUrlFor(existing.webhookToken));
      return existing;
    } catch (error) {
      const mapped = mapGatewayError(error);
      if (mapped.code === "INSTANCE_MISSING") return replaceInstance(existing);
      if (mapped.code === "PROVIDER_CONFLICT") return existing;
      throw mapped;
    }
  }

  async function requestQr(row: ConnectionRecord, userId: string, replaced = false): Promise<ConnectResult> {
    const wait = retryAfterMs(row.qrRequestedAt, now(), QR_REQUEST_WINDOW_MS);
    if (wait > 0) throw new WhatsappServiceError("RATE_LIMITED", 429, wait);
    try {
      const qrCode = await gateway.getQr(row.instanceId);
      const updated = await write(row, userId, {
        status: "qr_pending",
        phone: null,
        qrRequestedAt: now().toISOString(),
        qrVersion: row.qrVersion + 1,
        statusCheckedAt: now().toISOString(),
      });
      return { connection: await present(updated), qrCode, pending: false };
    } catch (error) {
      const mapped = mapGatewayError(error);
      if (mapped.code === "PROVIDER_CONFLICT") {
        const updated = await write(row, userId, {
          status: "connecting",
          statusCheckedAt: now().toISOString(),
        });
        return { connection: await present(updated), qrCode: null, pending: true };
      }
      if (mapped.code === "INSTANCE_MISSING" && !replaced) {
        return requestQr(await replaceInstance(row), userId, true);
      }
      throw mapped;
    }
  }

  async function applyRemoteStatus(
    row: ConnectionRecord,
    instanceStatus: string,
    source: "status" | "event"
  ): Promise<ConnectionRecord> {
    let phone: string | null = null;
    if (needsPhoneLookup(instanceStatus) || (source === "event" && (instanceStatus === "ready" || instanceStatus === "authenticated"))) {
      try {
        phone = await gateway.getMe(row.instanceId);
      } catch (error) {
        const mapped = mapGatewayError(error);
        if (mapped.code !== "PROVIDER_CONFLICT" && mapped.code !== "INSTANCE_MISSING") throw mapped;
      }
    }
    const next = reduceConnection(
      row,
      source === "status"
        ? { kind: "status", instanceStatus }
        : { kind: "event", event: instanceStatus },
      phone
    );
    const becameConnected = next.markConnected && row.status !== "connected";
    const updated = await store.updateById(row.id, {
      status: next.status,
      phone: next.phone,
      lastConnectedAt: becameConnected ? now().toISOString() : row.lastConnectedAt,
      statusCheckedAt: now().toISOString(),
      qrVersion: source === "event" && instanceStatus === "qr" ? row.qrVersion + 1 : row.qrVersion,
    });
    if (!updated) throw new WhatsappServiceError("NOT_FOUND", 404);
    if (becameConnected) {
      await store.audit({
        actorProfileId: updated.userId,
        action: "whatsapp.connected",
        entityId: updated.id,
        metadata: { status: "connected" },
      });
    }
    return updated;
  }

  return {
    async getConnection(userId: string): Promise<PublicConnection> {
      const row = await store.findConnectionByUser(userId);
      if (row && row.userId !== userId) throw new WhatsappServiceError("OWNERSHIP_REQUIRED", 403);
      return present(row);
    },

    async connect(userId: string): Promise<ConnectResult> {
      const row = await ensureInstance(userId);
      if (row.status === "connected" && row.phone) {
        return { connection: await present(row), qrCode: null, pending: false };
      }
      const result = await requestQr(row, userId);
      await store.audit({
        actorProfileId: userId,
        action: "whatsapp.connect_requested",
        entityId: row.id,
        metadata: { status: result.connection.status },
      });
      return result;
    },

    async regenerateQr(userId: string): Promise<ConnectResult> {
      const row = await requireOwn(userId);
      if (row.status === "connected" && row.phone) {
        return { connection: await present(row), qrCode: null, pending: false };
      }
      return requestQr(row, userId);
    },

    async refresh(userId: string): Promise<PublicConnection> {
      const row = await requireOwn(userId);
      const wait = retryAfterMs(row.statusCheckedAt, now(), STATUS_POLL_WINDOW_MS);
      if (wait > 0) return present(row);
      let instanceStatus: string;
      try {
        instanceStatus = await gateway.getStatus(row.instanceId);
      } catch (error) {
        const mapped = mapGatewayError(error);
        if (mapped.code === "PROVIDER_CONFLICT") {
          const updated = await write(row, userId, {
            status: "connecting",
            statusCheckedAt: now().toISOString(),
          });
          return present(updated);
        }
        throw mapped;
      }
      const updated = await applyRemoteStatus(row, instanceStatus, "status");
      if (updated.userId !== userId) throw new WhatsappServiceError("OWNERSHIP_REQUIRED", 403);
      return present(updated);
    },

    async disconnect(userId: string): Promise<PublicConnection> {
      const row = await requireOwn(userId);
      try {
        await gateway.logout(row.instanceId);
      } catch (error) {
        const mapped = mapGatewayError(error);
        if (mapped.code !== "INSTANCE_MISSING" && mapped.code !== "PROVIDER_CONFLICT") throw mapped;
      }
      const updated = await write(row, userId, {
        status: "disconnected",
        phone: null,
        statusCheckedAt: now().toISOString(),
      });
      await store.audit({
        actorProfileId: userId,
        action: "whatsapp.disconnected",
        entityId: updated.id,
        metadata: { status: "disconnected" },
      });
      return present(updated);
    },

    async listGroups(userId: string): Promise<PublicGroup[]> {
      const row = await requireOwn(userId);
      const saved = await store.listActiveGroups(row.id);
      if (row.status !== "connected") {
        return mergeGroups([], saved);
      }
      const wait = retryAfterMs(row.chatsRequestedAt, now(), CHAT_REQUEST_WINDOW_MS);
      if (wait > 0) throw new WhatsappServiceError("RATE_LIMITED", 429, wait);
      let discovered;
      try {
        discovered = await gateway.getGroups(row.instanceId);
      } catch (error) {
        throw mapGatewayError(error);
      }
      await write(row, userId, { chatsRequestedAt: now().toISOString() });
      return mergeGroups(discovered, saved);
    },

    async saveGroup(userId: string, groupId: string): Promise<PublicGroup[]> {
      if (!isWhatsappGroupId(groupId)) throw new WhatsappServiceError("INVALID_GROUP", 400);
      const row = await requireOwn(userId);
      if (row.status !== "connected") throw new WhatsappServiceError("NOT_CONNECTED", 409);
      let discovered;
      try {
        discovered = await gateway.getGroups(row.instanceId);
      } catch (error) {
        throw mapGatewayError(error);
      }
      const match = discovered.find((group) => group.id === groupId);
      if (!match) throw new WhatsappServiceError("GROUP_NOT_FOUND", 404);
      await store.upsertGroup(row.id, match);
      await store.audit({
        actorProfileId: userId,
        action: "whatsapp.group_saved",
        entityId: row.id,
        metadata: { groupId: match.id },
      });
      const saved = await store.listActiveGroups(row.id);
      return mergeGroups(discovered, saved);
    },

    async removeGroup(userId: string, groupId: string): Promise<PublicGroup[]> {
      if (!isWhatsappGroupId(groupId)) throw new WhatsappServiceError("INVALID_GROUP", 400);
      const row = await requireOwn(userId);
      const removed = await store.deactivateGroup(row.id, groupId);
      if (!removed) throw new WhatsappServiceError("GROUP_NOT_FOUND", 404);
      await store.audit({
        actorProfileId: userId,
        action: "whatsapp.group_removed",
        entityId: row.id,
        metadata: { groupId },
      });
      const saved = await store.listActiveGroups(row.id);
      return mergeGroups([], saved);
    },

    async handleWebhook(token: string, payload: unknown): Promise<"updated" | "ignored"> {
      const parsed = parseWaapiWebhook(payload);
      const row = await store.findConnectionByWebhookToken(token);
      const allowed = authorizeWaapiWebhook({
        providedToken: token,
        storedToken: row?.webhookToken ?? null,
        payloadInstanceId: parsed?.instanceId ?? "",
        storedInstanceId: row?.instanceId ?? null,
      });
      if (!parsed || !row || !allowed) throw new WhatsappServiceError("UNAUTHORIZED", 401);
      if (parsed.event === "ignored") return "ignored";
      await applyRemoteStatus(row, parsed.event, "event");
      return "updated";
    },
  };
}

export type WhatsappService = ReturnType<typeof createWhatsappService>;
