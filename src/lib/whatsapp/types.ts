export const STORED_CONNECTION_STATUSES = [
  "qr_pending",
  "connecting",
  "connected",
  "disconnected",
  "auth_failure",
] as const;

export type StoredConnectionStatus = (typeof STORED_CONNECTION_STATUSES)[number];

export type PublicConnectionStatus = StoredConnectionStatus | "not_connected";

export interface ConnectionRecord {
  id: string;
  userId: string;
  businessId: string | null;
  instanceId: string;
  webhookToken: string;
  phone: string | null;
  status: StoredConnectionStatus;
  qrVersion: number;
  qrRequestedAt: string | null;
  chatsRequestedAt: string | null;
  statusCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastConnectedAt: string | null;
}

export interface ConnectionPatch {
  instanceId?: string;
  status?: StoredConnectionStatus;
  phone?: string | null;
  qrVersion?: number;
  qrRequestedAt?: string | null;
  chatsRequestedAt?: string | null;
  statusCheckedAt?: string | null;
  lastConnectedAt?: string | null;
}

export interface PublicConnection {
  status: PublicConnectionStatus;
  phone: string | null;
  connectedAt: string | null;
  savedGroupCount: number;
  updatedAt: string | null;
  qrVersion: number;
}

export interface DiscoveredGroup {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface SavedGroup {
  id: string;
  connectionId: string;
  whatsappGroupId: string;
  name: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicGroup {
  id: string;
  name: string;
  imageUrl: string | null;
  saved: boolean;
  available: boolean;
}

export interface WhatsappStore {
  findConnectionByUser(userId: string): Promise<ConnectionRecord | null>;
  findConnectionByWebhookToken(token: string): Promise<ConnectionRecord | null>;
  findBusinessId(userId: string): Promise<string | null>;
  insertConnection(input: {
    userId: string;
    businessId: string | null;
    instanceId: string;
    webhookToken: string;
  }): Promise<ConnectionRecord>;
  updateForUser(
    id: string,
    userId: string,
    patch: ConnectionPatch
  ): Promise<ConnectionRecord | null>;
  updateById(id: string, patch: ConnectionPatch): Promise<ConnectionRecord | null>;
  listActiveGroups(connectionId: string): Promise<SavedGroup[]>;
  countActiveGroups(connectionId: string): Promise<number>;
  upsertGroup(connectionId: string, group: DiscoveredGroup): Promise<SavedGroup>;
  deactivateGroup(connectionId: string, groupId: string): Promise<boolean>;
  audit(entry: {
    actorProfileId: string;
    action: string;
    entityId: string;
    metadata?: Record<string, string>;
  }): Promise<void>;
}

export interface WaapiGateway {
  createInstance(input: { name: string; webhookUrl: string }): Promise<{ id: string }>;
  updateWebhook(instanceId: string, webhookUrl: string): Promise<void>;
  deleteInstance(instanceId: string): Promise<void>;
  getStatus(instanceId: string): Promise<string>;
  getQr(instanceId: string): Promise<string>;
  getMe(instanceId: string): Promise<string | null>;
  logout(instanceId: string): Promise<void>;
  getGroups(instanceId: string): Promise<DiscoveredGroup[]>;
}

export class WhatsappServiceError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryAfterMs?: number;

  constructor(code: string, status: number, retryAfterMs?: number) {
    super(code);
    this.name = "WhatsappServiceError";
    this.code = code;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}
