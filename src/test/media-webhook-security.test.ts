import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Retired media webhooks", () => {
  it("does not expose a Bunny Stream webhook route", () => {
    expect(existsSync("src/app/api/webhooks/bunny/route.ts")).toBe(false);
    expect(existsSync("src/lib/video/bunny.ts")).toBe(false);
  });
});
