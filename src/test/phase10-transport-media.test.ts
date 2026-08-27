import { describe, it, expect } from "vitest";
import {
  validateTransportVideo,
  validateTransportVideoSource,
} from "@/lib/transport/video-validation";
import { TRANSPORT_VIDEO_MAX_SECONDS } from "@/lib/transport/constants";

describe("Transport vehicle media validation", () => {
  it("accepts videos up to 30 seconds", () => {
    const result = validateTransportVideo({
      mimeType: "video/mp4",
      fileSize: 2 * 1024 * 1024,
      durationSeconds: TRANSPORT_VIDEO_MAX_SECONDS,
      fileName: "vehicle.mp4",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects videos longer than 30 seconds", () => {
    const result = validateTransportVideo({
      mimeType: "video/mp4",
      fileSize: 2 * 1024 * 1024,
      durationSeconds: 45,
      fileName: "vehicle.mp4",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("TRANSPORT_VIDEO_TOO_LONG");
  });

  it("accepts common source video mime types before optimization", () => {
    const result = validateTransportVideoSource({
      mimeType: "video/quicktime",
      fileSize: 1024 * 1024,
      fileName: "vehicle.mov",
    });
    expect(result.ok).toBe(true);
  });
});
