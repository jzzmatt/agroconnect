import { describe, it, expect } from "vitest";
import {
  buildBunnyTusAuthorizationSignature,
  isBunnyUploadReceived,
  mapBunnyStatus,
  parseBunnyLibraryId,
} from "@/lib/video/bunny";

describe("Bunny upload helpers", () => {
  it("treats only pending/deleted as not received", () => {
    expect(isBunnyUploadReceived("pending")).toBe(false);
    expect(isBunnyUploadReceived("deleted")).toBe(false);
    expect(isBunnyUploadReceived("uploading")).toBe(true);
    expect(isBunnyUploadReceived("processing")).toBe(true);
    expect(isBunnyUploadReceived("ready")).toBe(true);
  });

  it("maps Bunny status code 0 to pending", () => {
    expect(mapBunnyStatus(0)).toBe("pending");
    expect(mapBunnyStatus(1)).toBe("uploading");
    expect(mapBunnyStatus(4)).toBe("ready");
  });

  it("builds the documented TUS signature string", () => {
    const signature = buildBunnyTusAuthorizationSignature({
      libraryId: "12345",
      apiKey: "api-key",
      expire: 1700000000,
      videoId: "video-guid",
    });
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
    expect(
      buildBunnyTusAuthorizationSignature({
        libraryId: "12345",
        apiKey: "api-key",
        expire: 1700000000,
        videoId: "video-guid",
      })
    ).toBe(signature);
  });

  it("accepts only numeric Bunny library IDs", () => {
    expect(parseBunnyLibraryId("156467")).toBe("156467");
    expect(parseBunnyLibraryId(156467)).toBe("156467");
    expect(() => parseBunnyLibraryId("not-a-library-id")).toThrow(/BUNNY_STREAM_LIBRARY_ID/);
  });
});
