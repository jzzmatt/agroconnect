import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("AgriAcademy Bunny upload flow", () => {
  it("exposes JSON academy video API routes and middleware passthrough", () => {
    const middleware = readFileSync("src/middleware.ts", "utf8");
    expect(middleware).toContain('"/api/academy(.*)"');
    expect(readFileSync("src/app/api/academy/video/create/route.ts", "utf8")).toContain(
      "createAcademyVideoUploadAction"
    );
    expect(readFileSync("src/app/api/academy/video/complete/route.ts", "utf8")).toContain(
      "confirmAcademyVideoUploadAction"
    );
  });

  it("uses file picker + TUS upload instead of a metadata-only demo button", () => {
    const mediaLibrary = readFileSync("src/components/academy/MediaLibraryModal.tsx", "utf8");
    const uploader = readFileSync("src/components/academy/AcademyVideoUploader.tsx", "utf8");
    const bunnyUpload = readFileSync("src/lib/products/bunny-upload.ts", "utf8");
    expect(mediaLibrary).toContain("AcademyVideoUploader");
    expect(mediaLibrary).toContain("getAcademyVideoPreviewAction");
    expect(uploader).not.toContain("handleDemoUpload");
    expect(uploader).toContain('fetch("/api/academy/video/create"');
    expect(uploader).toContain("uploadToBunnyTus");
    expect(uploader).toContain('fetch("/api/academy/video/complete"');
    expect(bunnyUpload).toContain("uploadDataDuringCreation: true");
    expect(bunnyUpload).toContain("onBeforeRequest");
    expect(bunnyUpload).toContain("bunny:${videoId}:");
  });
});
