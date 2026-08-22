import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  SUBSCRIPTION_PLANS,
  getUserEntitlements,
  canAccessAgriProduct,
  canCreateProducts,
  canPublishProducts,
  canUploadProductVideo,
  countActiveProducts,
  isProductLimitReached,
  isPaidSubscriptionActive,
  VIDEO_STORAGE_QUOTA_BYTES,
  GB,
} from "@/lib/services/pricing-service";
import { PRODUCT_VIDEO_MAX_SECONDS } from "@/config/product-catalog";
import {
  clampTrimWindow,
  needsProductVideoTrim,
  validateProductVideo,
  validateProductVideoSource,
} from "@/lib/products/video-validation";
import { PRODUCT_ERROR_CODES } from "@/lib/products/errors";
import { SIGN_OUT_REDIRECT } from "@/lib/auth/clear-client-state";
import { sanitizeActivationError } from "@/lib/subscription/activation-errors";
import { getDictionary } from "@/i18n";
import { localizeError } from "@/i18n/errors";
import {
  clearOptimisticPlan,
  getOptimisticPlan,
  setOptimisticPlan,
} from "@/lib/subscription/optimistic";

describe("Phase 9.7 — sign-out, entitlements, AgriProduct, 60s video", () => {
  it("sign-out always redirects to the public landing page", () => {
    expect(SIGN_OUT_REDIRECT).toBe("/");
  });

  it("does not surface Chrome message-port failures as the plan error", () => {
    expect(
      sanitizeActivationError(
        "The message port closed before a response was received.",
        "Não foi possível atualizar o seu plano."
      )
    ).toBe("Não foi possível atualizar o seu plano.");
    expect(sanitizeActivationError("Failed to fetch", "fallback")).toBe("fallback");
    expect(sanitizeActivationError("timeout", "fallback")).toBe("fallback");
  });

  it("activates plans through a JSON API instead of a Next.js server action", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const src = await readFile(resolve(process.cwd(), "src/app/pricing/page.tsx"), "utf8");
    expect(src).not.toMatch("activateSubscriptionPlanAction");
    expect(src).not.toMatch("withTimeout(");
    expect(src).toMatch("/api/subscription/activate");
  });

  it("keeps one plan matrix: Basic locked, Professional 10, Business/Enterprise unlimited", () => {
    expect(SUBSCRIPTION_PLANS.basic.priceMonthlyAoa).toBe(0);
    expect(SUBSCRIPTION_PLANS.professional.priceMonthlyAoa).toBe(15000);
    expect(SUBSCRIPTION_PLANS.business.priceMonthlyAoa).toBe(30000);
    expect(SUBSCRIPTION_PLANS.enterprise.priceMonthlyAoa).toBe(80000);
    expect(SUBSCRIPTION_PLANS.professional.productLimit).toBe(10);
    expect(SUBSCRIPTION_PLANS.business.productLimit).toBeNull();
    expect(SUBSCRIPTION_PLANS.enterprise.productLimit).toBeNull();
    expect(SUBSCRIPTION_PLANS.professional.videoStorageLimitGb).toBe(100);
    expect(SUBSCRIPTION_PLANS.business.videoStorageLimitGb).toBe(300);
    expect(SUBSCRIPTION_PLANS.enterprise.videoStorageLimitGb).toBe(1024);
  });

  it("exposes AgriProduct capabilities independently from the 10-product cap", () => {
    const basic = getUserEntitlements({ subscriptionPlan: "basic" });
    expect(basic.can_access_agriproduct).toBe(false);
    expect(basic.can_create_products).toBe(false);
    expect(basic.can_publish_products).toBe(false);
    expect(basic.can_upload_product_video).toBe(false);
    expect(canAccessAgriProduct("basic")).toBe(false);

    const atCap = getUserEntitlements({
      subscriptionPlan: "professional",
      activeProductCount: 10,
    });
    expect(atCap.can_access_agriproduct).toBe(true);
    expect(atCap.can_create_products).toBe(true);
    expect(atCap.can_publish_products).toBe(true);
    expect(atCap.product_limit_reached).toBe(true);
    expect(isProductLimitReached("professional", 10)).toBe(true);
    expect(isProductLimitReached("professional", 9)).toBe(false);

    for (const plan of ["professional", "business", "enterprise"] as const) {
      expect(canAccessAgriProduct(plan)).toBe(true);
      expect(canCreateProducts(plan)).toBe(true);
      expect(canPublishProducts(plan)).toBe(true);
      expect(canUploadProductVideo(plan)).toBe(true);
      expect(getUserEntitlements({ subscriptionPlan: plan }).can_access_agriacademy).toBe(true);
    }
  });

  it("does not grant paid capabilities when the subscription is not active", () => {
    expect(isPaidSubscriptionActive("professional", "pending")).toBe(false);
    const pending = getUserEntitlements({
      subscriptionPlan: "professional",
      subscriptionStatus: "cancelled",
    });
    expect(pending.plan).toBe("professional");
    expect(pending.can_create_products).toBe(false);
    expect(pending.can_access_agriproduct).toBe(false);
  });

  it("counts only active catalog products toward the Professional limit", () => {
    expect(
      countActiveProducts([
        { status: "published" },
        { status: "active" },
        { status: "draft" },
        { status: "archived" },
        { status: "deleted" },
      ])
    ).toBe(3);
  });

  it("Business and Enterprise stay unlimited above 10 products", () => {
    const biz = getUserEntitlements({ subscriptionPlan: "business", activeProductCount: 25 });
    const ent = getUserEntitlements({ subscriptionPlan: "enterprise", activeProductCount: 40 });
    expect(biz.product_limit).toBeNull();
    expect(biz.product_limit_reached).toBe(false);
    expect(ent.product_limit).toBeNull();
    expect(ent.can_create_products).toBe(true);
    expect(VIDEO_STORAGE_QUOTA_BYTES.business).toBe(300 * GB);
    expect(VIDEO_STORAGE_QUOTA_BYTES.enterprise).toBe(1024 * GB);
  });

  it("enforces a 60-second product video maximum and offers trim above that", () => {
    expect(PRODUCT_VIDEO_MAX_SECONDS).toBe(60);
    expect(validateProductVideo({ mimeType: "video/mp4", fileSize: 1_000_000, durationSeconds: 10, fileName: "a.mp4" }).ok).toBe(true);
    expect(validateProductVideo({ mimeType: "video/mp4", fileSize: 1_000_000, durationSeconds: 60, fileName: "a.mp4" }).ok).toBe(true);
    expect(validateProductVideo({ mimeType: "video/mp4", fileSize: 1_000_000, durationSeconds: 61, fileName: "a.mp4" }).ok).toBe(false);
    expect(needsProductVideoTrim(61)).toBe(true);
    expect(needsProductVideoTrim(60)).toBe(false);
    const window = clampTrimWindow(30, 150, 134);
    expect(window.end - window.start).toBeLessThanOrEqual(60);
    expect(clampTrimWindow(0, 60, 180)).toEqual({ start: 0, end: 60 });
  });

  it("rejects unsupported source formats before upload", () => {
    expect(validateProductVideoSource({ mimeType: "video/avi", fileSize: 1000, fileName: "a.avi" }).ok).toBe(false);
    expect(validateProductVideoSource({ mimeType: "video/mp4", fileSize: 1_000_000, fileName: "clip.mp4" }).ok).toBe(true);
  });

  it("localizes 1-minute video copy and structured publish errors", () => {
    const pt = getDictionary("pt");
    const en = getDictionary("en");
    const fr = getDictionary("fr");
    expect(pt.products.videoIntroTitle).toMatch(/Vídeo/);
    expect(en.products.videoIntroBody).toMatch(/1 minute/);
    expect(fr.products.videoIntroBody).toMatch(/1 minute/);
    expect(localizeError(en, "PRODUCT_VIDEO_TOO_LONG")).toMatch(/1 minute/);
    expect(localizeError(pt, PRODUCT_ERROR_CODES.FEATURE_NOT_AVAILABLE)).toMatch(/Básico/);
    expect(localizeError(pt, "PRODUCT_PUBLISH_TIMEOUT")).toMatch(/Não foi possível concluir/);
    expect(pt.navDash.agriProduct).toBe("AgriProduct");
    expect(localizeError(pt, "BUNNY_NOT_CONFIGURED")).toMatch(/Bunny Stream/);
    expect(localizeError(en, "BUNNY_UPLOAD_FAILED")).toMatch(/Bunny Stream/);
  });

  it("points product video uploads at the official Bunny TUS endpoint", async () => {
    const { BUNNY_TUS_ENDPOINT, isBunnyConfigured, getBunnyEmbedUrl } = await import("@/lib/video/bunny");
    expect(BUNNY_TUS_ENDPOINT).toBe("https://video.bunnycdn.com/tusupload");
    expect(getBunnyEmbedUrl("123", "guid-1")).toBe(
      "https://iframe.mediadelivery.net/embed/123/guid-1"
    );
    expect(isBunnyConfigured()).toBe(
      Boolean(
        String(process.env.BUNNY_STREAM_API_KEY || "").trim() &&
          String(process.env.BUNNY_STREAM_LIBRARY_ID || "").trim()
      )
    );
  });
});

describe("Optimistic plan is never the source of truth", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    (globalThis as any).window = globalThis;
    (globalThis as any).sessionStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    };
  });

  afterEach(() => {
    clearOptimisticPlan();
  });

  it("stores a temporary plan only after the caller opts in", () => {
    expect(getOptimisticPlan()).toBeNull();
    setOptimisticPlan("professional");
    expect(getOptimisticPlan()).toBe("professional");
    clearOptimisticPlan();
    expect(getOptimisticPlan()).toBeNull();
  });
});
