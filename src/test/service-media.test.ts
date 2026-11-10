import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRODUCT_VIDEO_MAX_SECONDS } from "@/config/product-catalog";
import { assertServiceVideo } from "@/lib/services/service-media";

describe("service picture and video", () => {
  it("accepts a 60 second video and rejects a longer one", () => {
    expect(assertServiceVideo({
      mimeType: "video/mp4",
      fileSize: 1024,
      durationSeconds: PRODUCT_VIDEO_MAX_SECONDS,
    }).mimeType).toBe("video/mp4");
    expect(assertServiceVideo({
      mimeType: "video/quicktime",
      fileSize: 1024,
      durationSeconds: 30.004,
    })).toMatchObject({ mimeType: "video/webm", durationSeconds: 30 });
    expect(() => assertServiceVideo({
      mimeType: "video/webm",
      fileSize: 1024,
      durationSeconds: PRODUCT_VIDEO_MAX_SECONDS + 1,
    })).toThrow(expect.objectContaining({ code: "PRODUCT_VIDEO_TOO_LONG" }));
  });

  it("uses the product picture and video controls on the service editor and after creation", () => {
    const editor = readFileSync("src/components/marketplace/ServiceEditor.tsx", "utf8");
    const created = readFileSync("src/app/(dashboard)/dashboard/services/new/page.tsx", "utf8");
    const controls = readFileSync("src/components/marketplace/ServiceMediaControls.tsx", "utf8");
    const image = readFileSync("src/components/shopping/ProductImageUploader.tsx", "utf8");
    const video = readFileSync("src/components/shopping/ProductVideoUploader.tsx", "utf8");
    const upload = readFileSync("src/lib/services/service-video-upload-client.ts", "utf8");
    expect(editor).toContain("ServiceMediaControls");
    expect(created).toContain("ServiceMediaControls");
    expect(controls).toContain("ProductImageUploader");
    expect(controls).toContain("ProductVideoUploader");
    expect(image).toContain('capture="environment"');
    expect(video).toContain('capture="environment"');
    expect(upload).toContain("planTempVideoUpload");
    expect(upload).toContain("/video/chunk");
    expect(readFileSync("src/app/api/services/[serviceId]/video/complete/route.ts", "utf8")).toContain("completeServiceVideo");
    expect(readFileSync("src/app/api/services/[serviceId]/images/route.ts", "utf8")).toContain("requireServiceThumbnailOwner");
  });
});
