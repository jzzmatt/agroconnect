import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("product media is stored in Supabase", () => {
  it("uploads product videos with the Supabase signed-upload body", () => {
    const client = read("src/lib/academy/upload-storage-client.ts");
    const create = read("src/lib/services/product-video-service.ts");
    const images = read("src/lib/services/product-media-service.ts");
    const page = read("src/components/shopping/ProductCreateWorkspacePage.tsx");

    expect(client).toContain('xhr.setRequestHeader("x-upsert", "true")');
    expect(client).toContain("new FormData()");
    expect(client).not.toContain("imagekit");
    expect(create).toContain('provider: SUPABASE_STORAGE_PROVIDER');
    expect(create).toContain("createSignedUploadUrl");
    expect(create).not.toContain("imagekit");
    expect(images).toContain("uploadProductImageBuffer");
    expect(images).not.toContain("imagekit");
    expect(page).not.toContain("IMAGEKIT_UPLOAD_FAILED");
    expect(page).toContain("MEDIA_UPLOAD_FAILED");
  });
});
