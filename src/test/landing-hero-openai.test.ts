import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { AGROCONNECT_HERO_IMAGE_PROMPT } from "@/lib/openai/agroconnect-hero-prompt";
import { AGROCONNECT_HERO_IMAGE_MODEL } from "@/lib/openai/image-generation";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("landing hero GPT-Image-2 integration", () => {
  it("uses gpt-image-2 and the AgroConnect master prompt", () => {
    expect(AGROCONNECT_HERO_IMAGE_MODEL).toBe("gpt-image-2");
    expect(AGROCONNECT_HERO_IMAGE_PROMPT).toMatch(/Angola/i);
    expect(AGROCONNECT_HERO_IMAGE_PROMPT.length).toBeLessThanOrEqual(32000);
  });

  it("keeps OpenAI server-side only (not in client hero banner)", () => {
    const banner = read("src/components/landing/AgroConnectHeroBanner.tsx");
    expect(banner).not.toMatch(/openai/i);
    expect(banner).not.toMatch(/OPENAI_API_KEY/);
    expect(banner).toMatch("AGROCONNECT_HERO_IMAGE_PATH");
  });

  it("protects the admin regeneration route", () => {
    const route = read("src/app/api/admin/generate-agroconnect-hero/route.ts");
    expect(route).toMatch("requireAuth");
    expect(route).toMatch('account_type !== "admin"');
    expect(route).toMatch("generateAndSaveAgroConnectHeroImage");
  });

  it("ships an optimized hero asset path", () => {
    expect(existsSync(resolve(process.cwd(), "public/images/agroconnect-hero.webp"))).toBe(true);
  });
});
