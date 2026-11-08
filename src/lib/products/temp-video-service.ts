import { randomUUID } from "crypto";
import { validateProductVideo } from "@/lib/products/video-validation";
import {
  PERMANENT_VIDEO_BUCKET,
  TEMP_VIDEO_BUCKET,
  assertTempVideoRequestId,
  decideCancel,
  decideFinalize,
  decidePromote,
  decideSave,
  type TempVideoRecord,
} from "@/lib/products/temp-video-lifecycle";

export interface TempVideoStore {
  findByRequest(userId: string, clientRequestId: string): Promise<TempVideoRecord | null>;
  findById(id: string): Promise<TempVideoRecord | null>;
  insert(record: TempVideoRecord): Promise<TempVideoRecord>;
  update(id: string, userId: string, patch: Partial<TempVideoRecord>): Promise<TempVideoRecord | null>;
  findReadyVideo(productId: string, ownerId: string, path: string): Promise<boolean>;
  attachPermanentVideo(record: TempVideoRecord, productId: string): Promise<void>;
}

export interface TempVideoObjects {
  putTemp(path: string, bytes: Buffer, contentType: string): Promise<void>;
  copyToPermanent(tempPath: string, permanentPath: string, contentType: string): Promise<void>;
  permanentReadable(path: string): Promise<boolean>;
  deleteTemp(path: string): Promise<boolean>;
}

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

function extensionFor(mime: string): string {
  return mime === "video/mp4" ? "mp4" : "webm";
}

export async function saveTempVideo(params: {
  userId: string;
  clientRequestId: string;
  mimeType: string;
  fileSize: number;
  durationSeconds: number;
  bytes: Buffer;
  store: TempVideoStore;
  objects: TempVideoObjects;
}): Promise<TempVideoRecord> {
  assertTempVideoRequestId(params.clientRequestId);
  const mime = params.mimeType === "video/mp4" ? "video/mp4" : "video/webm";
  const valid = validateProductVideo({
    mimeType: mime,
    fileSize: params.fileSize,
    durationSeconds: params.durationSeconds,
    fileName: `clip.${extensionFor(mime)}`,
  });
  if (!valid.ok) fail(valid.code);

  const existing = await params.store.findByRequest(params.userId, params.clientRequestId);
  const decision = decideSave(existing);
  if (decision === "return" && existing) return existing;
  if (decision === "busy") fail("TEMP_VIDEO_BUSY");

  const id = existing?.id || randomUUID();
  const tempPath = `${params.userId}/${id}.${extensionFor(mime)}`;
  const draft: TempVideoRecord = {
    id,
    userId: params.userId,
    productId: existing?.productId || null,
    clientRequestId: params.clientRequestId,
    status: "processing",
    tempPath,
    permanentPath: null,
    mimeType: mime,
    fileSize: params.fileSize,
    durationSeconds: params.durationSeconds,
    errorCode: null,
  };
  const created = existing
    ? (await params.store.update(existing.id, params.userId, draft)) || existing
    : await params.store.insert(draft);

  try {
    await params.objects.putTemp(tempPath, params.bytes, mime);
  } catch (error) {
    await params.store.update(created.id, params.userId, {
      status: "deleted",
      errorCode: "TEMP_VIDEO_UPLOAD_FAILED",
    });
    throw error;
  }

  const saved = await params.store.update(created.id, params.userId, { status: "saved", errorCode: null });
  return saved || created;
}

export async function cancelTempVideo(params: {
  userId: string;
  tempId: string;
  store: TempVideoStore;
  objects: TempVideoObjects;
}): Promise<{ deleted: boolean; status: TempVideoRecord["status"] }> {
  const record = await params.store.findById(params.tempId);
  if (!record || record.userId !== params.userId) fail("TEMP_VIDEO_NOT_FOUND");
  const decision = decideCancel(record, params.userId);
  if (decision === "reject") fail("TEMP_VIDEO_NOT_FOUND");
  if (decision === "already_deleted") return { deleted: true, status: "deleted" };
  if (decision === "keep") fail("TEMP_VIDEO_KEEP");
  if (!record.tempPath) {
    await params.store.update(record.id, params.userId, { status: "deleted", errorCode: null });
    return { deleted: true, status: "deleted" };
  }
  const gone = await params.objects.deleteTemp(record.tempPath);
  if (!gone) {
    await params.store.update(record.id, params.userId, { status: "cleanup_failed", errorCode: "TEMP_VIDEO_DELETE_UNCONFIRMED" });
    fail("TEMP_VIDEO_DELETE_UNCONFIRMED");
  }
  await params.store.update(record.id, params.userId, { status: "deleted", tempPath: null, errorCode: null });
  return { deleted: true, status: "deleted" };
}

export async function promoteTempVideo(params: {
  userId: string;
  tempId: string;
  productId: string;
  store: TempVideoStore;
  objects: TempVideoObjects;
}): Promise<TempVideoRecord> {
  const record = await params.store.findById(params.tempId);
  if (!record || record.userId !== params.userId) fail("TEMP_VIDEO_NOT_FOUND");
  const decision = decidePromote(record, params.userId);
  if (decision === "reject") fail("TEMP_VIDEO_NOT_READY");

  if (decision === "reuse" && record.permanentPath) {
    const readable = await params.objects.permanentReadable(record.permanentPath);
    if (!readable) {
      await params.store.update(record.id, params.userId, { errorCode: "PERMANENT_VIDEO_UNREADABLE" });
      fail("PERMANENT_VIDEO_UNREADABLE");
    }
    return (await params.store.update(record.id, params.userId, { productId: params.productId, errorCode: null })) || record;
  }

  if (!record.tempPath) fail("TEMP_VIDEO_NOT_READY");
  const permanentPath = record.permanentPath || `${params.userId}/${params.productId}/videos/${record.id}.${record.mimeType === "video/mp4" ? "mp4" : "webm"}`;
  await params.store.update(record.id, params.userId, {
    status: "transferring",
    productId: params.productId,
    permanentPath,
    errorCode: null,
  });

  try {
    const already = await params.objects.permanentReadable(permanentPath);
    if (!already) {
      await params.objects.copyToPermanent(record.tempPath, permanentPath, record.mimeType);
    }
  } catch (error) {
    await params.store.update(record.id, params.userId, { status: "saved", errorCode: "PERMANENT_TRANSFER_FAILED" });
    throw error;
  }

  const readable = await params.objects.permanentReadable(permanentPath);
  if (!readable) {
    await params.store.update(record.id, params.userId, { status: "saved", permanentPath, errorCode: "PERMANENT_VIDEO_UNREADABLE" });
    fail("PERMANENT_VIDEO_UNREADABLE");
  }

  const ready = await params.store.update(record.id, params.userId, {
    status: "permanent_ready",
    productId: params.productId,
    permanentPath,
    errorCode: null,
  });
  if (!ready) fail("TEMP_VIDEO_NOT_FOUND");
  return ready;
}

export async function finalizeTempVideo(params: {
  userId: string;
  tempId: string;
  productId: string;
  store: TempVideoStore;
  objects: TempVideoObjects;
}): Promise<TempVideoRecord> {
  const record = await params.store.findById(params.tempId);
  if (!record || record.userId !== params.userId) fail("TEMP_VIDEO_NOT_FOUND");
  if (record.productId && record.productId !== params.productId) fail("TEMP_VIDEO_NOT_FOUND");
  const decision = decideFinalize(record, params.userId);
  if (decision === "reject" || decision === "done" && !record.permanentPath) {
    if (decision === "done") return record;
    fail("TEMP_VIDEO_NOT_READY");
  }
  if (decision === "done") return record;
  if (!record.permanentPath) fail("TEMP_VIDEO_NOT_READY");

  const readable = await params.objects.permanentReadable(record.permanentPath);
  if (!readable) {
    await params.store.update(record.id, params.userId, { errorCode: "PERMANENT_VIDEO_UNREADABLE" });
    fail("PERMANENT_VIDEO_UNREADABLE");
  }

  const attached = await params.store.findReadyVideo(params.productId, params.userId, record.permanentPath);
  if (!attached) {
    await params.store.attachPermanentVideo({ ...record, productId: params.productId }, params.productId);
  }

  if (!record.tempPath) {
    const done = await params.store.update(record.id, params.userId, { status: "transferred", productId: params.productId, errorCode: null });
    return done || record;
  }
  const gone = await params.objects.deleteTemp(record.tempPath);
  if (!gone) {
    await params.store.update(record.id, params.userId, { status: "cleanup_failed", errorCode: "TEMP_VIDEO_DELETE_UNCONFIRMED" });
    fail("TEMP_VIDEO_DELETE_UNCONFIRMED");
  }
  const done = await params.store.update(record.id, params.userId, {
    status: "transferred",
    productId: params.productId,
    tempPath: null,
    errorCode: null,
  });
  if (!done) fail("TEMP_VIDEO_NOT_FOUND");
  return done;
}

export const tempVideoBuckets = {
  temporary: TEMP_VIDEO_BUCKET,
  permanent: PERMANENT_VIDEO_BUCKET,
};
