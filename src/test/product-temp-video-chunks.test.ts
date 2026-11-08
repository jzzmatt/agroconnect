import { describe, expect, it } from "vitest";
import { PRODUCT_VIDEO_MAX_BYTES } from "@/config/product-catalog";
import type { TempVideoRecord } from "@/lib/products/temp-video-lifecycle";
import {
  TEMP_VIDEO_CHUNK_BYTES,
  assembleTempVideoChunks,
  finishChunkedTempVideo,
  planTempVideoUpload,
  tempVideoChunkPath,
} from "@/lib/products/temp-video-chunks";

const USER = "11111111-1111-4111-8111-111111111111";
const REQUEST = "request-id-000001";

function savedRecord(thumbnailTempPath: string | null): TempVideoRecord {
  return {
    id: "temp-1",
    userId: USER,
    productId: null,
    clientRequestId: REQUEST,
    status: "saved",
    tempPath: `${USER}/temp-1.webm`,
    permanentPath: null,
    thumbnailTempPath,
    thumbnailPermanentPath: null,
    mimeType: "video/webm",
    fileSize: 4,
    durationSeconds: 2,
    errorCode: null,
  };
}

describe("temporary video chunks", () => {
  it("splits a processed video into parts that stay under the request limit", () => {
    expect(planTempVideoUpload(1)).toEqual({ total: 1, chunkBytes: TEMP_VIDEO_CHUNK_BYTES });
    expect(planTempVideoUpload(PRODUCT_VIDEO_MAX_BYTES).total).toBe(Math.ceil(PRODUCT_VIDEO_MAX_BYTES / TEMP_VIDEO_CHUNK_BYTES));
    expect(TEMP_VIDEO_CHUNK_BYTES).toBeLessThan(4 * 1024 * 1024);
    expect(() => planTempVideoUpload(PRODUCT_VIDEO_MAX_BYTES + 1)).toThrow(/PRODUCT_VIDEO_TOO_LARGE/);
  });

  it("stores each part under the signed-in user", () => {
    expect(tempVideoChunkPath(USER, REQUEST, 0, 2)).toBe(`${USER}/chunks/${REQUEST}/0`);
    expect(() => tempVideoChunkPath("../other", REQUEST, 0, 1)).toThrow(/INVALID_REQUEST/);
    expect(() => tempVideoChunkPath(USER, "short", 0, 1)).toThrow(/INVALID_REQUEST/);
  });

  it("does not save when a middle part is missing", async () => {
    let saves = 0;
    const fileSize = TEMP_VIDEO_CHUNK_BYTES + 2;
    const read = async (path: string) => (path.endsWith("/0") ? Buffer.alloc(TEMP_VIDEO_CHUNK_BYTES, 1) : null);
    await expect(
      assembleTempVideoChunks({
        userId: USER,
        clientRequestId: REQUEST,
        total: 2,
        fileSize,
        read,
      })
    ).rejects.toThrow(/CHUNK_MISSING/);

    await expect(
      finishChunkedTempVideo({
        userId: USER,
        clientRequestId: REQUEST,
        total: 2,
        fileSize,
        mimeType: "video/webm",
        durationSeconds: 2,
        read,
        remove: async () => undefined,
        findSaved: async () => null,
        save: async () => {
          saves += 1;
          return savedRecord("thumb");
        },
      })
    ).rejects.toThrow(/CHUNK_MISSING/);
    expect(saves).toBe(0);
  });

  it("assembles the parts once and keeps a completed save", async () => {
    const head = Buffer.alloc(TEMP_VIDEO_CHUNK_BYTES, 1);
    const tail = Buffer.from("cd");
    const parts = new Map<string, Buffer>([
      [`${USER}/chunks/${REQUEST}/0`, head],
      [`${USER}/chunks/${REQUEST}/1`, tail],
      [`${USER}/chunks/${REQUEST}/thumbnail.jpg`, Buffer.from("jpg")],
    ]);
    let saves = 0;
    const seen: { bytes: Buffer | null } = { bytes: null };
    const saved = await finishChunkedTempVideo({
      userId: USER,
      clientRequestId: REQUEST,
      total: 2,
      fileSize: head.length + tail.length,
      mimeType: "video/webm",
      durationSeconds: 2,
      read: async (path) => parts.get(path) || null,
      remove: async (path) => {
        parts.delete(path);
      },
      findSaved: async () => null,
      save: async (input) => {
        saves += 1;
        seen.bytes = input.bytes;
        expect(input.thumbnailBytes.toString()).toBe("jpg");
        return savedRecord(`${USER}/temp-1.jpg`);
      },
    });
    expect(seen.bytes?.subarray(0, 2).every((byte) => byte === 1)).toBe(true);
    expect(seen.bytes?.subarray(-2).toString()).toBe("cd");
    expect(seen.bytes?.length).toBe(head.length + tail.length);
    expect(saves).toBe(1);
    expect(parts.size).toBe(0);
    expect(saved.id).toBe("temp-1");

    const again = await finishChunkedTempVideo({
      userId: USER,
      clientRequestId: REQUEST,
      total: 2,
      fileSize: head.length + tail.length,
      mimeType: "video/webm",
      durationSeconds: 2,
      read: async () => null,
      remove: async () => undefined,
      findSaved: async () => savedRecord(`${USER}/temp-1.jpg`),
      save: async () => {
        saves += 1;
        return savedRecord("thumb");
      },
    });
    expect(again.status).toBe("saved");
    expect(saves).toBe(1);
  });
});
