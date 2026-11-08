import { describe, expect, it } from "vitest";
import { firstMinuteWindow } from "@/lib/products/video-validation";
import { keepsOriginalFile } from "@/lib/products/temp-video-lifecycle";
import { representativeFrameSeconds } from "@/lib/products/video-optimizer";
import type { TempVideoRecord } from "@/lib/products/temp-video-lifecycle";
import {
  attachTempVideoThumbnail,
  cancelTempVideo,
  finalizeTempVideo,
  promoteTempVideo,
  saveTempVideo,
  type TempVideoObjects,
  type TempVideoStore,
} from "@/lib/products/temp-video-service";

const REQUEST = "request-id-000001";

function memory() {
  const rows = new Map<string, TempVideoRecord>();
  const temp = new Map<string, Buffer>();
  const permanent = new Map<string, Buffer>();
  const attached: string[] = [];
  let failPut = false;
  let failThumb = false;
  let failThumbCopy = false;
  let failCopy = false;
  let failDelete = false;
  let copies = 0;

  const store: TempVideoStore = {
    async findByRequest(userId, clientRequestId) {
      return [...rows.values()].find((row) => row.userId === userId && row.clientRequestId === clientRequestId) || null;
    },
    async findById(id) {
      return rows.get(id) || null;
    },
    async insert(record) {
      rows.set(record.id, { ...record });
      return record;
    },
    async update(id, userId, patch) {
      const current = rows.get(id);
      if (!current || current.userId !== userId) return null;
      const next = { ...current, ...patch };
      rows.set(id, next);
      return next;
    },
    async findReadyVideo(_productId, _ownerId, path) {
      return attached.includes(path);
    },
    async attachPermanentVideo(record) {
      if (record.permanentPath && !attached.includes(record.permanentPath)) attached.push(record.permanentPath);
    },
  };

  const objects: TempVideoObjects = {
    async putTemp(path, bytes) {
      if (failPut) throw Object.assign(new Error("TEMP_VIDEO_UPLOAD_FAILED"), { code: "TEMP_VIDEO_UPLOAD_FAILED" });
      if (failThumb && path.endsWith(".jpg")) {
        throw Object.assign(new Error("THUMBNAIL_UPLOAD_FAILED"), { code: "THUMBNAIL_UPLOAD_FAILED" });
      }
      temp.set(path, bytes);
    },
    async copyToPermanent(tempPath, permanentPath) {
      copies += 1;
      if (failThumbCopy && permanentPath.endsWith(".jpg")) {
        throw Object.assign(new Error("PERMANENT_TRANSFER_FAILED"), { code: "PERMANENT_TRANSFER_FAILED" });
      }
      if (failCopy) throw Object.assign(new Error("PERMANENT_TRANSFER_FAILED"), { code: "PERMANENT_TRANSFER_FAILED" });
      const bytes = temp.get(tempPath);
      if (!bytes) throw new Error("TEMP_VIDEO_MISSING");
      permanent.set(permanentPath, bytes);
    },
    async permanentReadable(path) {
      return permanent.has(path);
    },
    async deleteTemp(path) {
      if (failDelete) return false;
      temp.delete(path);
      return !temp.has(path);
    },
  };

  return {
    store,
    objects,
    rows,
    temp,
    permanent,
    attached,
    set failPut(value: boolean) {
      failPut = value;
    },
    set failThumb(value: boolean) {
      failThumb = value;
    },
    set failThumbCopy(value: boolean) {
      failThumbCopy = value;
    },
    set failCopy(value: boolean) {
      failCopy = value;
    },
    set failDelete(value: boolean) {
      failDelete = value;
    },
    get copies() {
      return copies;
    },
  };
}

function clip(seconds: number) {
  return {
    userId: "user-1",
    clientRequestId: REQUEST,
    mimeType: "video/webm",
    fileSize: 1200,
    durationSeconds: seconds,
    bytes: Buffer.from("video"),
  };
}

describe("AgriProduct temporary video lifecycle", () => {
  it("keeps a video shorter than 60 seconds intact", () => {
    expect(firstMinuteWindow(18).end).toBe(18);
    expect(keepsOriginalFile(18, "video/mp4")).toBe(true);
  });

  it("keeps only the first 60 seconds of a longer video", () => {
    expect(firstMinuteWindow(125).start).toBe(0);
    expect(firstMinuteWindow(125).end).toBe(60);
    expect(keepsOriginalFile(125, "video/mp4")).toBe(false);
  });

  it("does not store a file when processing or upload fails", async () => {
    const box = memory();
    box.failPut = true;
    await expect(saveTempVideo({ ...clip(20), store: box.store, objects: box.objects })).rejects.toThrow(/UPLOAD_FAILED/);
    expect(box.temp.size).toBe(0);
    expect([...box.rows.values()][0]?.status).toBe("deleted");
  });

  it("rejects a processed file that is still longer than 60 seconds", async () => {
    const box = memory();
    await expect(saveTempVideo({ ...clip(75), store: box.store, objects: box.objects })).rejects.toMatchObject({
      code: "PRODUCT_VIDEO_TOO_LONG",
    });
    expect(box.temp.size).toBe(0);
  });

  it("cancels only the owner's temporary file after deletion is confirmed", async () => {
    const box = memory();
    const saved = await saveTempVideo({ ...clip(12), store: box.store, objects: box.objects });
    await expect(cancelTempVideo({ userId: "other", tempId: saved.id, store: box.store, objects: box.objects })).rejects.toMatchObject({
      code: "TEMP_VIDEO_NOT_FOUND",
    });
    expect(box.temp.size).toBe(1);
    const removed = await cancelTempVideo({ userId: "user-1", tempId: saved.id, store: box.store, objects: box.objects });
    expect(removed.deleted).toBe(true);
    expect(box.temp.size).toBe(0);
    expect(box.rows.get(saved.id)?.status).toBe("deleted");
  });

  it("keeps the temporary file when deletion cannot be confirmed", async () => {
    const box = memory();
    const saved = await saveTempVideo({ ...clip(12), store: box.store, objects: box.objects });
    box.failDelete = true;
    await expect(cancelTempVideo({ userId: "user-1", tempId: saved.id, store: box.store, objects: box.objects })).rejects.toMatchObject({
      code: "TEMP_VIDEO_DELETE_UNCONFIRMED",
    });
    expect(box.temp.size).toBe(1);
    expect(box.rows.get(saved.id)?.status).toBe("cleanup_failed");
  });

  it("keeps the temporary video when permanent transfer fails", async () => {
    const box = memory();
    const saved = await saveTempVideo({ ...clip(30), store: box.store, objects: box.objects });
    box.failCopy = true;
    await expect(
      promoteTempVideo({ userId: "user-1", tempId: saved.id, productId: "product-1", store: box.store, objects: box.objects })
    ).rejects.toThrow(/TRANSFER_FAILED/);
    expect(box.temp.size).toBe(1);
    expect(box.permanent.size).toBe(0);
    expect(box.rows.get(saved.id)?.status).toBe("saved");
  });

  it("keeps the temporary video when product publication stops before cleanup", async () => {
    const box = memory();
    const saved = await saveTempVideo({ ...clip(30), store: box.store, objects: box.objects });
    const ready = await promoteTempVideo({
      userId: "user-1",
      tempId: saved.id,
      productId: "product-1",
      store: box.store,
      objects: box.objects,
    });
    expect(ready.status).toBe("permanent_ready");
    let published = false;
    const publishProduct = async () => {
      throw Object.assign(new Error("PRODUCT_PUBLISH_FAILED"), { code: "PRODUCT_PUBLISH_FAILED" });
    };
    await expect(publishProduct()).rejects.toMatchObject({ code: "PRODUCT_PUBLISH_FAILED" });
    expect(published).toBe(false);
    expect(box.temp.size).toBe(1);
    expect(box.permanent.size).toBe(1);
    expect(box.attached).toHaveLength(0);
  });

  it("does not remove permanent media when WhatsApp publishing fails, and retry does not copy again", async () => {
    const box = memory();
    const saved = await saveTempVideo({ ...clip(40), store: box.store, objects: box.objects });
    await promoteTempVideo({ userId: "user-1", tempId: saved.id, productId: "product-1", store: box.store, objects: box.objects });
    await finalizeTempVideo({ userId: "user-1", tempId: saved.id, productId: "product-1", store: box.store, objects: box.objects });
    expect(box.temp.size).toBe(0);
    expect(box.permanent.size).toBe(1);
    const whatsapp = async () => {
      throw Object.assign(new Error("WAAPI_FAILED"), { code: "WAAPI_FAILED" });
    };
    await expect(whatsapp()).rejects.toMatchObject({ code: "WAAPI_FAILED" });
    expect(box.permanent.size).toBe(1);
    await promoteTempVideo({ userId: "user-1", tempId: saved.id, productId: "product-1", store: box.store, objects: box.objects });
    await finalizeTempVideo({ userId: "user-1", tempId: saved.id, productId: "product-1", store: box.store, objects: box.objects });
    expect(box.copies).toBe(1);
    expect(box.attached).toHaveLength(1);
    expect(box.permanent.size).toBe(1);
  });

  it("returns the saved video when the same request is repeated", async () => {
    const box = memory();
    const first = await saveTempVideo({ ...clip(15), store: box.store, objects: box.objects });
    const second = await saveTempVideo({ ...clip(15), store: box.store, objects: box.objects });
    expect(second.id).toBe(first.id);
    expect(box.temp.size).toBe(1);
    await expect(
      saveTempVideo({
        ...clip(15),
        store: {
          ...box.store,
          async findByRequest() {
            return { ...first, status: "processing" };
          },
        },
        objects: box.objects,
      })
    ).rejects.toMatchObject({ code: "TEMP_VIDEO_BUSY" });
  });

  it("does not create a thumbnail while saving the video", async () => {
    const box = memory();
    const saved = await saveTempVideo({ ...clip(20), store: box.store, objects: box.objects });
    expect(saved.status).toBe("saved");
    expect(saved.thumbnailTempPath).toBeNull();
    expect([...box.temp.keys()].some((path) => path.endsWith(".jpg"))).toBe(false);
  });

  it("stores an optional thumbnail and keeps the saved video when thumbnail storage fails", async () => {
    const box = memory();
    const saved = await saveTempVideo({ ...clip(20), store: box.store, objects: box.objects });
    box.failThumb = true;
    await expect(
      attachTempVideoThumbnail({
        userId: "user-1",
        tempId: saved.id,
        bytes: Buffer.from("thumb"),
        mimeType: "image/jpeg",
        store: box.store,
        objects: box.objects,
      })
    ).rejects.toThrow(/THUMBNAIL_UPLOAD_FAILED/);
    expect(box.rows.get(saved.id)?.status).toBe("saved");
    expect(box.rows.get(saved.id)?.tempPath).toBeTruthy();
    box.failThumb = false;
    const withThumbnail = await attachTempVideoThumbnail({
      userId: "user-1",
      tempId: saved.id,
      bytes: Buffer.from("thumb"),
      mimeType: "image/jpeg",
      store: box.store,
      objects: box.objects,
    });
    expect(withThumbnail.status).toBe("saved");
    expect(withThumbnail.thumbnailTempPath?.endsWith(".jpg")).toBe(true);
  });

  it("keeps the permanent video when the optional thumbnail cannot be copied", async () => {
    const box = memory();
    const saved = await saveTempVideo({ ...clip(20), store: box.store, objects: box.objects });
    await attachTempVideoThumbnail({
      userId: "user-1",
      tempId: saved.id,
      bytes: Buffer.from("thumb"),
      mimeType: "image/jpeg",
      store: box.store,
      objects: box.objects,
    });
    box.failThumbCopy = true;
    const ready = await promoteTempVideo({
      userId: "user-1",
      tempId: saved.id,
      productId: "product-1",
      store: box.store,
      objects: box.objects,
    });
    expect(ready.status).toBe("permanent_ready");
    expect(ready.thumbnailPermanentPath).toBeNull();
    expect([...box.permanent.keys()].some((path) => path.endsWith(".webm"))).toBe(true);
    expect([...box.permanent.keys()].some((path) => path.endsWith(".jpg"))).toBe(false);
    expect(box.temp.size).toBe(2);
  });

  it("chooses a frame after the start of a longer clip", () => {
    expect(representativeFrameSeconds(0.2)).toBe(0);
    expect(representativeFrameSeconds(8)).toBe(1);
    expect(representativeFrameSeconds(1.2)).toBe(0.6);
  });
});
