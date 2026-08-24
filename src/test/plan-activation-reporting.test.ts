import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setAuthoritativeSubscription, getAuthoritativeSubscription, resetAuthoritativeSubscriptions } from "@/lib/subscription/store";

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const ACTIVATE = "src/lib/subscription/activate-plan.ts";
const ROUTE = "src/app/api/subscription/activate/route.ts";
const SYNC_MODAL = "src/components/subscription/SubscriptionSyncModal.tsx";
const HEALTH = "src/app/api/health/config/route.ts";

describe("plan activation reports the real outcome", () => {
  it("no longer returns an unconditional success", () => {
    const src = read(ACTIVATE);
    // The old bug: `success: true` was returned regardless of whether the row
    // was written, with the truth buried in an unread `persisted` field.
    expect(src).not.toMatch(/if \(!persist\.ok && !persist\.unavailable\)/);
    expect(src).toMatch(/if \(!persist\.ok\)/);
    expect(src).toMatch('return fail("PLAN_NOT_PERSISTED"');
  });

  it("caches the plan only after the write succeeds", () => {
    const src = read(ACTIVATE);
    const persistAt = src.indexOf("const persist = await persistSubscriptionPlan");
    const cacheAt = src.indexOf("cachePlan(clerkUserId, confirmed)");
    expect(persistAt).toBeGreaterThan(-1);
    expect(cacheAt).toBeGreaterThan(-1);
    // Caching before persisting is what made a failed write look applied.
    expect(cacheAt).toBeGreaterThan(persistAt);
  });

  it("declares a distinct code for every failure mode", () => {
    const src = read(ACTIVATE);
    for (const code of [
      "ACTIVATED",
      "AUTH_REQUIRED",
      "ACTIVATION_DISABLED",
      "SUPABASE_NOT_CONFIGURED",
      "PLAN_NOT_PERSISTED",
      "INVALID_PLAN",
      "UNEXPECTED_ERROR",
    ]) {
      expect(src).toMatch(`"${code}"`);
    }
  });

  it("maps each code to a distinguishable HTTP status", () => {
    const src = read(ROUTE);
    expect(src).toMatch("STATUS_BY_CODE");
    expect(src).toMatch(/AUTH_REQUIRED: 401/);
    expect(src).toMatch(/ACTIVATION_DISABLED: 403/);
    expect(src).toMatch(/SUPABASE_NOT_CONFIGURED: 503/);
    expect(src).toMatch(/PLAN_NOT_PERSISTED: 502/);
  });

  it("surfaces the diagnostic code to the user instead of a bare generic message", () => {
    const errors = read("src/lib/subscription/activation-errors.ts");
    const src = read(SYNC_MODAL);
    expect(errors).toMatch("export function withDiagnosticCode");
    expect(src).toMatch("withDiagnosticCode");
    expect(src).toMatch("result?.code");
  });

  it("reports activation readiness from the health endpoint", () => {
    const src = read(HEALTH);
    expect(src).toMatch("planActivation");
    expect(src).toMatch("canPersistPlan");
    expect(src).toMatch("blockedBy");
    expect(src).toMatch("serviceRoleKeyPresent");
  });
});

describe("caching a plan does not overwrite unrelated preferences", () => {
  it("preserves an existing market country and language", () => {
    resetAuthoritativeSubscriptions();
    setAuthoritativeSubscription("user-1", {
      plan: "basic",
      marketCountryCode: "PT",
      preferredLanguage: "fr",
    });

    // What cachePlan now does: patch the plan alone.
    setAuthoritativeSubscription("user-1", { plan: "business" });

    const record = getAuthoritativeSubscription("user-1");
    expect(record?.plan).toBe("business");
    expect(record?.marketCountryCode).toBe("PT");
    expect(record?.preferredLanguage).toBe("fr");
    resetAuthoritativeSubscriptions();
  });

  it("does not pass a market or language when caching an activated plan", () => {
    const src = read(ACTIVATE);
    const fn = src.slice(
      src.indexOf("function cachePlan"),
      src.indexOf("function persistPayload")
    );
    expect(fn).not.toMatch("marketCountryCode");
    expect(fn).not.toMatch("preferredLanguage");
  });
});
