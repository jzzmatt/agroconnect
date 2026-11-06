import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { can, subjectFromProfile } from "@/lib/authorization";
import { waapiRequest } from "@/lib/integrations/waapi/client";
import { readInstanceId } from "@/lib/integrations/waapi/instances";
import { readConnectedPhone, readInstanceStatus, readQrDataUrl } from "@/lib/integrations/waapi/connection";
import { extractGroups, readChats } from "@/lib/integrations/waapi/groups";
import { authorizeWaapiWebhook, parseWaapiWebhook } from "@/lib/integrations/waapi/webhooks";
import { reduceConnection, searchGroups, upsertSavedGroup } from "@/lib/whatsapp/model";
import { createWhatsappService } from "@/lib/whatsapp/service";
import type {
  ConnectionPatch,
  ConnectionRecord,
  DiscoveredGroup,
  SavedGroup,
  WaapiGateway,
  WhatsappStore,
} from "@/lib/whatsapp/types";
import { WhatsappServiceError } from "@/lib/whatsapp/types";

const QR = "data:image/png;base64,iVBORw0KGgo=";
const GROUP = "120363123456789012@g.us";
const SECRET = "private-message-body-should-not-leak";

function subject(plan: "basic" | null) {
  return subjectFromProfile({
    id: "profile-1",
    clerk_user_id: "clerk-1",
    roles: ["student"],
    account_type: "customer",
    subscription_plan: plan,
    subscription_status: plan ? "active" : null,
  });
}

function memoryStore() {
  const connections: ConnectionRecord[] = [];
  const groups: SavedGroup[] = [];
  const audits: string[] = [];
  let sequence = 0;

  const store: WhatsappStore = {
    async findConnectionByUser(userId) {
      return connections.find((row) => row.userId === userId) ?? null;
    },
    async findConnectionByWebhookToken(token) {
      return connections.find((row) => row.webhookToken === token) ?? null;
    },
    async findBusinessId() {
      return null;
    },
    async insertConnection(input) {
      if (connections.some((row) => row.userId === input.userId || row.instanceId === input.instanceId)) {
        throw new WhatsappServiceError("DUPLICATE_CONNECTION", 409);
      }
      const row: ConnectionRecord = {
        id: `conn-${++sequence}`,
        userId: input.userId,
        businessId: input.businessId,
        instanceId: input.instanceId,
        webhookToken: input.webhookToken,
        phone: null,
        status: "disconnected",
        qrVersion: 0,
        qrRequestedAt: null,
        chatsRequestedAt: null,
        statusCheckedAt: null,
        createdAt: "2026-11-06T10:00:00.000Z",
        updatedAt: "2026-11-06T10:00:00.000Z",
        lastConnectedAt: null,
      };
      connections.push(row);
      return row;
    },
    async updateForUser(id, userId, patch) {
      const row = connections.find((item) => item.id === id && item.userId === userId);
      if (!row) return null;
      applyPatch(row, patch);
      return row;
    },
    async updateById(id, patch) {
      const row = connections.find((item) => item.id === id);
      if (!row) return null;
      applyPatch(row, patch);
      return row;
    },
    async listActiveGroups(connectionId) {
      return groups.filter((group) => group.connectionId === connectionId && group.isActive);
    },
    async countActiveGroups(connectionId) {
      return groups.filter((group) => group.connectionId === connectionId && group.isActive).length;
    },
    async upsertGroup(connectionId, group) {
      const next = upsertSavedGroup(groups, connectionId, group, "2026-11-06T10:00:00.000Z");
      groups.splice(0, groups.length, ...next);
      return groups.find((item) => item.connectionId === connectionId && item.whatsappGroupId === group.id)!;
    },
    async deactivateGroup(connectionId, groupId) {
      const row = groups.find(
        (group) => group.connectionId === connectionId && group.whatsappGroupId === groupId && group.isActive
      );
      if (!row) return false;
      row.isActive = false;
      return true;
    },
    async audit(entry) {
      audits.push(entry.action);
    },
  };

  return { store, connections, groups, audits };
}

function applyPatch(row: ConnectionRecord, patch: ConnectionPatch) {
  if (patch.instanceId !== undefined) row.instanceId = patch.instanceId;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.qrVersion !== undefined) row.qrVersion = patch.qrVersion;
  if (patch.qrRequestedAt !== undefined) row.qrRequestedAt = patch.qrRequestedAt;
  if (patch.chatsRequestedAt !== undefined) row.chatsRequestedAt = patch.chatsRequestedAt;
  if (patch.statusCheckedAt !== undefined) row.statusCheckedAt = patch.statusCheckedAt;
  if (patch.lastConnectedAt !== undefined) row.lastConnectedAt = patch.lastConnectedAt;
}

function gateway() {
  let instanceSeq = 100;
  const status = new Map<string, string>();
  const calls = { create: 0, qr: 0, logout: 0, groups: 0, deleted: [] as string[] };
  const api: WaapiGateway = {
    async createInstance() {
      calls.create += 1;
      const id = String(++instanceSeq);
      status.set(id, "qr");
      return { id };
    },
    async updateWebhook() {},
    async deleteInstance(id) {
      calls.deleted.push(id);
    },
    async getStatus(id) {
      return status.get(id) || "qr";
    },
    async getQr(id) {
      calls.qr += 1;
      if (!status.has(id)) {
        const error = new Error("missing") as Error & { status: number };
        error.status = 404;
        throw error;
      }
      return QR;
    },
    async getMe(id) {
      return status.get(id) === "ready" ? "+244923000111" : null;
    },
    async logout(id) {
      calls.logout += 1;
      status.set(id, "disconnected");
    },
    async getGroups() {
      calls.groups += 1;
      return [{ id: GROUP, name: "Feira do milho", imageUrl: "https://cdn.example/group.jpg" }];
    },
  };
  return { api, status, calls };
}

function serviceFor(store: WhatsappStore, api: WaapiGateway, start = "2026-11-06T10:00:00.000Z") {
  let current = Date.parse(start);
  let tokens = 0;
  const clock = {
    advance(ms: number) {
      current += ms;
    },
  };
  const service = createWhatsappService({
    store,
    gateway: api,
    now: () => new Date(current),
    webhookUrlFor: (token) => `https://agroconnect.test/api/webhooks/waapi/${token}`,
    createToken: () => `tok${String(++tokens).padStart(40, "0")}`,
  });
  return { service, clock };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("WaAPI payloads", () => {
  it("reads the documented instance, QR, status and phone shapes", () => {
    expect(readInstanceId({ instance: { id: 42 }, status: "success" })).toBe("42");
    expect(readQrDataUrl({ qrCode: { data: { qr_code: QR } } })).toBe(QR);
    expect(readQrDataUrl({ qrCode: { data: { qr_code: "https://example/qr.png" } } })).toBeNull();
    expect(readInstanceStatus({ clientStatus: { instanceStatus: "ready" } })).toBe("ready");
    expect(
      readConnectedPhone({
        me: { data: { formattedNumber: "+244 923 000 111", contactId: "244923000111@c.us" } },
      })
    ).toBe("+244 923 000 111");
  });

  it("keeps groups and drops private chat contents", () => {
    const chats = readChats({
      status: "success",
      data: {
        status: "success",
        data: [
          {
            id: { _serialized: "244923000111@c.us" },
            name: "Cliente",
            isGroup: false,
            lastMessage: { body: SECRET },
          },
          {
            id: { _serialized: GROUP },
            name: "Feira do milho",
            isGroup: true,
            profilePicUrl: "https://cdn.example/group.jpg",
            lastMessage: { body: SECRET },
          },
          {
            id: { _serialized: "120363000@newsletter" },
            name: "Canal",
            isGroup: false,
          },
        ],
      },
    });
    const groups = extractGroups(chats);
    expect(groups).toEqual([
      {
        id: GROUP,
        name: "Feira do milho",
        isGroup: true,
        imageUrl: "https://cdn.example/group.jpg",
      },
    ]);
    expect(JSON.stringify(groups)).not.toContain(SECRET);
  });

  it("does not put the API token in a failed request error", async () => {
    vi.stubEnv("WAAPI_API_TOKEN", "super-secret-token");
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer super-secret-token");
      return new Response(JSON.stringify({ message: "super-secret-token" }), { status: 401 });
    });
    await expect(
      waapiRequest("/instances/1/client/qr", { method: "GET" }, fetchImpl as typeof fetch)
    ).rejects.toThrow("WAAPI_REQUEST_FAILED");
    try {
      await waapiRequest("/instances/1/client/qr", { method: "GET" }, fetchImpl as typeof fetch);
    } catch (error) {
      expect((error as Error).message).not.toContain("super-secret-token");
    }
  });

  it("rejects a webhook whose token or instance does not match the stored connection", () => {
    const stored = "a".repeat(43);
    expect(
      authorizeWaapiWebhook({
        providedToken: stored,
        storedToken: stored,
        payloadInstanceId: "101",
        storedInstanceId: "101",
      })
    ).toBe(true);
    expect(
      authorizeWaapiWebhook({
        providedToken: `${stored}x`,
        storedToken: stored,
        payloadInstanceId: "101",
        storedInstanceId: "101",
      })
    ).toBe(false);
    expect(
      authorizeWaapiWebhook({
        providedToken: stored,
        storedToken: stored,
        payloadInstanceId: "999",
        storedInstanceId: "101",
      })
    ).toBe(false);
    expect(parseWaapiWebhook({ event: "ready", instanceId: 101, data: { body: SECRET } })?.event).toBe(
      "ready"
    );
    expect(parseWaapiWebhook({ event: "message", instanceId: "101", data: { body: SECRET } })?.event).toBe(
      "ignored"
    );
  });
});

describe("connection lifecycle", () => {
  it("does not mark the account connected until WaAPI confirms the number", async () => {
    const { store, connections } = memoryStore();
    const { api, status } = gateway();
    const { service, clock } = serviceFor(store, api);

    const started = await service.connect("user-a");
    expect(started.qrCode).toBe(QR);
    expect(started.connection.status).toBe("qr_pending");
    expect(started.connection.phone).toBeNull();
    expect(JSON.stringify(started)).not.toContain(connections[0].webhookToken);

    clock.advance(3_000);
    status.set(connections[0].instanceId, "authenticated");
    const pending = await service.refresh("user-a");
    expect(pending.status).not.toBe("connected");
    expect(pending.phone).toBeNull();

    clock.advance(3_000);
    status.set(connections[0].instanceId, "ready");
    const connected = await service.refresh("user-a");
    expect(connected.status).toBe("connected");
    expect(connected.phone).toBe("+244923000111");
    expect(connected.connectedAt).toBeTruthy();
  });

  it("keeps a failed authentication disconnected from a success state", async () => {
    const { store, connections } = memoryStore();
    const { api, status } = gateway();
    const { service, clock } = serviceFor(store, api);
    await service.connect("user-a");
    clock.advance(3_000);
    status.set(connections[0].instanceId, "auth_failure");
    const failed = await service.refresh("user-a");
    expect(failed.status).toBe("auth_failure");
    expect(failed.phone).toBeNull();
  });

  it("reuses the same instance when reconnecting and does not share it", async () => {
    const { store, connections } = memoryStore();
    const { api, calls, status } = gateway();
    const { service, clock } = serviceFor(store, api);
    await service.connect("user-a");
    const first = connections[0].instanceId;
    clock.advance(3_000);
    status.set(first, "ready");
    await service.refresh("user-a");
    await service.disconnect("user-a");
    expect(calls.logout).toBe(1);
    expect(connections[0].phone).toBeNull();
    expect(connections[0].status).toBe("disconnected");

    clock.advance(20_000);
    const again = await service.connect("user-a");
    expect(again.qrCode).toBe(QR);
    expect(connections).toHaveLength(1);
    expect(connections[0].instanceId).toBe(first);
    expect(calls.create).toBe(1);

    await service.connect("user-b");
    expect(connections).toHaveLength(2);
    expect(connections[1].instanceId).not.toBe(first);
    await expect(service.listGroups("user-b")).resolves.toEqual([]);
    await expect(service.getConnection("user-c")).resolves.toMatchObject({ status: "not_connected" });
  });

  it("rate limits QR regeneration and still refuses a successful state without a number", async () => {
    const { store } = memoryStore();
    const { api } = gateway();
    const { service } = serviceFor(store, api);
    await service.connect("user-a");
    await expect(service.regenerateQr("user-a")).rejects.toMatchObject({ code: "RATE_LIMITED" });
    const next = reduceConnection(
      { status: "qr_pending", phone: null },
      { kind: "status", instanceStatus: "disconnected" },
      null
    );
    expect(next).toEqual({ status: "disconnected", phone: null, markConnected: false });
    const unconfirmed = reduceConnection(
      { status: "connecting", phone: null },
      { kind: "status", instanceStatus: "ready" },
      null
    );
    expect(unconfirmed.markConnected).toBe(false);
    expect(unconfirmed.status).not.toBe("connected");
  });

  it("does not create a connection when WaAPI refuses the instance", async () => {
    const { store, connections } = memoryStore();
    const { api } = gateway();
    api.createInstance = async () => {
      const error = new Error("card declined") as Error & { status: number };
      error.status = 402;
      throw error;
    };
    const { service } = serviceFor(store, api);
    await expect(service.connect("user-a")).rejects.toMatchObject({ code: "PROVIDER_PAYMENT" });
    expect(connections).toHaveLength(0);
  });
});

describe("saved groups", () => {
  async function connectedUser() {
    const memory = memoryStore();
    const remote = gateway();
    const { service, clock } = serviceFor(memory.store, remote.api);
    await service.connect("user-a");
    clock.advance(3_000);
    remote.status.set(memory.connections[0].instanceId, "ready");
    await service.refresh("user-a");
    return { ...memory, service, remote };
  }

  it("saves, searches, refreshes and removes without duplicates", async () => {
    const { service, groups } = await connectedUser();
    const saved = await service.saveGroup("user-a", GROUP);
    expect(saved.find((group) => group.id === GROUP)).toMatchObject({ saved: true, name: "Feira do milho" });
    await service.saveGroup("user-a", GROUP);
    expect(groups.filter((group) => group.whatsappGroupId === GROUP)).toHaveLength(1);

    const found = searchGroups(saved, "milho");
    expect(found).toHaveLength(1);
    expect(searchGroups(saved, "privado")).toHaveLength(0);

    await expect(service.saveGroup("user-a", "244923000111@c.us")).rejects.toMatchObject({
      code: "INVALID_GROUP",
    });
    const removed = await service.removeGroup("user-a", GROUP);
    expect(removed.find((group) => group.id === GROUP)?.saved).not.toBe(true);
    expect(groups[0].isActive).toBe(false);
    const again = await service.saveGroup("user-a", GROUP);
    expect(again.find((group) => group.id === GROUP)?.saved).toBe(true);
    expect(groups).toHaveLength(1);
  });

  it("does not let another user save or remove the owner's group", async () => {
    const { service } = await connectedUser();
    await service.saveGroup("user-a", GROUP);
    await expect(service.removeGroup("user-b", GROUP)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.listGroups("user-b")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.saveGroup("user-b", GROUP)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("webhooks", () => {
  it("applies a confirmed ready event and ignores a foreign payload", async () => {
    const { store, connections } = memoryStore();
    const { api, status } = gateway();
    const { service, clock } = serviceFor(store, api);
    await service.connect("user-a");
    const row = connections[0];
    const versionAfterQr = row.qrVersion;
    clock.advance(3_000);
    await service.refresh("user-a");
    expect(row.qrVersion).toBe(versionAfterQr);

    await service.handleWebhook(row.webhookToken, {
      event: "qr",
      instanceId: row.instanceId,
      data: { qr: SECRET },
    });
    expect(row.qrVersion).toBe(versionAfterQr + 1);
    expect(JSON.stringify(row)).not.toContain(SECRET);

    status.set(row.instanceId, "ready");

    await expect(
      service.handleWebhook(row.webhookToken, {
        event: "ready",
        instanceId: row.instanceId,
        data: { body: SECRET },
      })
    ).resolves.toBe("updated");
    expect(row.status).toBe("connected");
    expect(row.phone).toBe("+244923000111");
    expect(JSON.stringify(row)).not.toContain(SECRET);

    await expect(
      service.handleWebhook("wrong-token-wrong-token-wrong-token", {
        event: "disconnected",
        instanceId: row.instanceId,
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(row.status).toBe("connected");

    status.set(row.instanceId, "disconnected");
    await service.handleWebhook(row.webhookToken, {
      event: "disconnected",
      instanceId: Number(row.instanceId),
      data: { reason: "LOGOUT" },
    });
    expect(row.status).toBe("disconnected");
    expect(row.phone).toBeNull();
  });
});

describe("access and persistence rules", () => {
  it("allows a subscribed user and denies a user with no stored plan", () => {
    expect(can(subject("basic"), "whatsapp.connect")).toBe(true);
    expect(can(subject(null), "whatsapp.connect")).toBe(false);
    expect(can(null, "whatsapp.connect")).toBe(false);
  });

  it("locks the connection down in the database migration", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/migrations/20261106104021_whatsapp_connections.sql"),
      "utf8"
    );
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("uq_whatsapp_connections_user");
    expect(sql).toContain("uq_whatsapp_connections_instance");
    expect(sql).toContain("uq_whatsapp_saved_groups");
    expect(sql).toContain("current_clerk_user_id()");
    expect(sql).toContain("REVOKE ALL ON TABLE public.whatsapp_connections");
    expect(sql).not.toContain("FOR ALL");
    expect(sql).not.toContain("WAAPI_API_TOKEN");
  });

  it("keeps the provider token out of the browser bundle sources", () => {
    const page = readFileSync(
      resolve(process.cwd(), "src/components/whatsapp/WhatsAppIntegration.tsx"),
      "utf8"
    );
    const client = readFileSync(
      resolve(process.cwd(), "src/lib/integrations/waapi/client.ts"),
      "utf8"
    );
    expect(page).not.toContain("WAAPI_API_TOKEN");
    expect(page).not.toContain("NEXT_PUBLIC_WAAPI");
    expect(client).toContain("WAAPI_API_TOKEN");
    expect(client).not.toContain("NEXT_PUBLIC_WAAPI");
  });
});
