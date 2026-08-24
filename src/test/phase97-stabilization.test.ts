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
import { sanitizePublishError } from "@/lib/products/publish-errors";
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
    const src = await readFile(resolve(process.cwd(), "src/components/subscription/PlanCatalog.tsx"), "utf8");
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

  it("publishes products through a JSON API instead of a raced server action", async () => {
    const { readFileSync } = await import("node:fs");
    const page = readFileSync("src/app/(dashboard)/dashboard/products/new/page.tsx", "utf8");
    const middleware = readFileSync("src/middleware.ts", "utf8");
    expect(page).toContain('fetch("/api/products/create"');
    expect(page).not.toContain("createProductAction(");
    expect(page).not.toContain("Promise.race");
    expect(middleware).toContain('"/api/products(.*)"');
  });

  it("persists an activated plan even when the profile row does not exist yet", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const src = await readFile(
      resolve(process.cwd(), "src/lib/subscription/activate-plan.ts"),
      "utf8"
    );
    // An UPDATE matches zero rows for a Clerk user with no profile, which left
    // the plan in server memory only and made product create read "basic".
    expect(src).toMatch("getCurrentUserProfile");
    expect(src).toMatch(".upsert(");
    expect(src).toMatch('onConflict: "clerk_user_id"');
    // The result must reflect the real write outcome. This previously asserted
    // `persisted: persist.ok` alongside an unconditional `success: true`; the
    // contract is now stronger, so a failed write fails the whole activation.
    expect(src).toMatch('return fail("PLAN_NOT_PERSISTED"');
    expect(src).toMatch("persisted: true");
  });

  it("classifies a dropped Supabase connection as a network fault, not a plan fault", async () => {
    const { describeSupabaseError, isTransientSupabaseError } = await import(
      "@/lib/supabase/retry"
    );
    const undiciFailure = Object.assign(new TypeError("fetch failed"), {
      cause: Object.assign(new Error("getaddrinfo ENOTFOUND db.example.supabase.co"), {
        code: "ENOTFOUND",
      }),
    });
    expect(isTransientSupabaseError(undiciFailure)).toBe(true);
    expect(describeSupabaseError(undiciFailure)).toMatch("ENOTFOUND");
    expect(isTransientSupabaseError(new Error("duplicate key value"))).toBe(false);
  });

  it("retries a dropped Supabase connection and gives up on real errors", async () => {
    const { withSupabaseRetry } = await import("@/lib/supabase/retry");

    let attempts = 0;
    const recovered = await withSupabaseRetry("probe", async () => {
      attempts += 1;
      if (attempts < 3) throw new TypeError("fetch failed");
      return { data: { id: "ok" }, error: null };
    });
    expect(attempts).toBe(3);
    expect(recovered.data.id).toBe("ok");

    let constraintAttempts = 0;
    await expect(
      withSupabaseRetry("probe", async () => {
        constraintAttempts += 1;
        throw new Error("duplicate key value violates unique constraint");
      })
    ).rejects.toThrow(/duplicate key/);
    expect(constraintAttempts).toBe(1);
  });

  it("retries when supabase-js returns the connection failure instead of throwing", async () => {
    const { withSupabaseRetry } = await import("@/lib/supabase/retry");

    // supabase-js swallows the exception and reports it on `error`.
    let attempts = 0;
    const recovered = await withSupabaseRetry("probe", async () => {
      attempts += 1;
      if (attempts < 2) {
        return {
          data: null as { id: string } | null,
          error: { message: "TypeError: fetch failed" } as { message: string } | null,
        };
      }
      return { data: { id: "ok" }, error: null };
    });
    expect(attempts).toBe(2);
    expect(recovered.data?.id).toBe("ok");

    let constraintAttempts = 0;
    const rejected = await withSupabaseRetry("probe", async () => {
      constraintAttempts += 1;
      return { data: null, error: { message: "duplicate key value" } };
    });
    expect(constraintAttempts).toBe(1);
    expect(rejected.error.message).toMatch(/duplicate key/);
  });

  it("names the missing database variables instead of failing opaquely", async () => {
    const { isSupabaseConfigured, missingSupabaseEnvVars } = await import(
      "@/lib/supabase/server"
    );
    const original = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      service: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    try {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      expect(isSupabaseConfigured()).toBe(false);
      expect(missingSupabaseEnvVars()).toEqual([
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
      ]);

      // The placeholder fallback must not read as configured.
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder-agroconnect.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_placeholder_key";
      expect(isSupabaseConfigured()).toBe(false);

      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://real-project.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_real";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
      expect(isSupabaseConfigured()).toBe(true);
      expect(missingSupabaseEnvVars()).toEqual([]);
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = original.url;
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = original.key;
      process.env.SUPABASE_SERVICE_ROLE_KEY = original.service;
    }
  });

  it("reports an unconfigured deployment as unhealthy without leaking values", async () => {
    const { GET } = await import("@/app/api/health/config/route");
    const original = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      service: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    try {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.canPublishProducts).toBe(false);
      expect(body.supabase.configured).toBe(false);
      expect(body.supabase.missing).toContain("NEXT_PUBLIC_SUPABASE_URL");
      // Only presence flags, never the secret itself.
      expect(JSON.stringify(body)).not.toMatch(/eyJ|sb_publishable_|sk_test_/);
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = original.url;
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = original.key;
      process.env.SUPABASE_SERVICE_ROLE_KEY = original.service;
    }
  });

  it("does not surface Chrome extension listener errors as the publish reason", () => {
    expect(
      sanitizePublishError(
        "A listener indicated an asynchronous response by returning true",
        "PRODUCT_PUBLISH_FAILED"
      )
    ).toBe("PRODUCT_PUBLISH_FAILED");
    expect(sanitizePublishError("FEATURE_NOT_AVAILABLE", "PRODUCT_PUBLISH_FAILED")).toBe(
      "FEATURE_NOT_AVAILABLE"
    );
  });

  it("rejects fake product ids and normalizes video mime for Bunny", async () => {
    const { isUuid, normalizeVideoUploadMeta } = await import("@/lib/products/ids");
    expect(isUuid("prd-abc123")).toBe(false);
    expect(isUuid("pimg-not-a-uuid")).toBe(false);
    expect(isUuid("2c9c1b7a-4d3e-4f21-9b0a-1a2b3c4d5e6f")).toBe(true);
    expect(normalizeVideoUploadMeta({ mimeType: "video/webm;codecs=vp9,opus", fileName: "clip.mov" })).toEqual({
      mimeType: "video/webm",
      fileName: "clip.webm",
    });
  });

  it("corrects reversed Bunny library ID and API key", async () => {
    const { normalizeBunnyCredentials } = await import("@/lib/video/bunny");
    const swapped = normalizeBunnyCredentials("123456", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(swapped.swapped).toBe(true);
    expect(swapped.libraryId).toBe("123456");
    expect(swapped.apiKey).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    const ok = normalizeBunnyCredentials("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "123456");
    expect(ok.swapped).toBe(false);
    expect(ok.libraryId).toBe("123456");
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
