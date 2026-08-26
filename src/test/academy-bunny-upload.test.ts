import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AgriAcademy no longer uploads to Bunny", () => {
  it("does not expose Academy Bunny upload API routes", () => {
    expect(existsSync("src/app/api/academy/video/create/route.ts")).toBe(false);
    expect(existsSync("src/app/api/academy/video/complete/route.ts")).toBe(false);
    expect(existsSync("src/app/api/academy/video/upload/route.ts")).toBe(false);

    const middleware = readFileSync("src/middleware.ts", "utf8");
    expect(middleware).toContain('"/api/academy(.*)"');
  });

  it("keeps product Bunny TUS helpers for legacy product rows only", () => {
    const bunnyUpload = readFileSync("src/lib/products/bunny-upload.ts", "utf8");
    expect(bunnyUpload).toContain("onBeforeRequest");
    expect(bunnyUpload).toContain("LibraryId");
    expect(existsSync("src/components/academy/AcademyVideoUploader.tsx")).toBe(false);
  });
});
