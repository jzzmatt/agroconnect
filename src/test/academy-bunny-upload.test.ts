import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ImageKit and Bunny Stream are removed", () => {
  it("does not keep upload clients, players, or the Bunny webhook", () => {
    expect(existsSync("src/lib/media/imagekit.ts")).toBe(false);
    expect(existsSync("src/lib/video/bunny.ts")).toBe(false);
    expect(existsSync("src/lib/video/bunny-constants.ts")).toBe(false);
    expect(existsSync("src/lib/products/bunny-upload.ts")).toBe(false);
    expect(existsSync("src/lib/products/imagekit-upload.ts")).toBe(false);
    expect(existsSync("src/components/shopping/BunnyPlayer.tsx")).toBe(false);
    expect(existsSync("src/app/api/webhooks/bunny/route.ts")).toBe(false);
    expect(existsSync("src/components/academy/AcademyVideoUploader.tsx")).toBe(false);
  });

  it("keeps Academy lesson routes on the app, not a retired video host", () => {
    const middleware = readFileSync("src/middleware.ts", "utf8");
    expect(middleware).toContain('"/api/academy(.*)"');
    expect(existsSync("src/app/api/academy/video/create/route.ts")).toBe(false);
  });
});
