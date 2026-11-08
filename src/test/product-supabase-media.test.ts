import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("product media is stored in Supabase", () => {
  it("stores product videos through the app so the browser does not call Storage", () => {
    const create = read("src/lib/services/product-video-service.ts");
    const images = read("src/lib/services/product-media-service.ts");
    const page = read("src/components/shopping/ProductCreateWorkspacePage.tsx");
    const upload = read("src/app/api/products/video/upload/route.ts");

    expect(create).toContain('provider: SUPABASE_STORAGE_PROVIDER');
    expect(create).toContain("uploadBufferToStorage");
    expect(create).not.toContain("imagekit");
    expect(images).toContain("uploadProductImageBuffer");
    expect(images).not.toContain("imagekit");
    expect(page).toContain('uploadForm("/api/products/video/temp"');
    expect(page).toContain("setVideoUploadPercent(percent)");
    expect(read("src/components/shopping/ProductVideoUploader.tsx")).toContain('role="progressbar"');
    expect(page).toContain("/api/products/video/temp/promote");
    expect(page).not.toContain('uploadForm("/api/products/video/upload"');
    expect(page).not.toContain("uploadBlobWithProgress");
    expect(page).not.toContain("supabase-pg17");
    expect(upload).toContain("saveUploadedFile");
    expect(upload).not.toContain("signedUrl");
  });
});
