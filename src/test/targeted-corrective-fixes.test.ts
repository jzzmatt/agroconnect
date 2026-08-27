import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MapLifecycleManager, coordinatesEqual, DEFAULT_ANGOLA_CENTER } from "@/lib/location/map-lifecycle";
import { getSelectablePlans } from "@/lib/services/pricing-service";
import { SUBSCRIPTION_PLANS } from "@/lib/services/pricing-service";

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("FIX 1 — subscription plan comes from the database", () => {
  it("prefers the database plan over the process-local cache", () => {
    const src = read("src/lib/clerk/auth.ts");
    expect(src).not.toMatch(/normalizePlanSlug\(memory\?\.plan \|\| dbPlan/);
    expect(src).not.toMatch(/dbPlan \|\| ["']basic["']/);
    expect(src).toMatch("const subscriptionPlan = parseStoredPlan(dbPlan)");
  });

  it("does not seed client plan state from sessionStorage", () => {
    const src = read("src/lib/subscription/use-authoritative-plan.ts");
    expect(src).not.toMatch("getOptimisticPlan");
    expect(src).not.toMatch(/localStorage\.(get|set)Item/);
    expect(src).not.toMatch(/sessionStorage\.(get|set)Item/);
    expect(src).toMatch("getAuthoritativeSubscriptionAction");
  });

  it("re-reads the plan from the database after a successful activation", () => {
    const src = read("src/lib/subscription/activate-plan.ts");
    expect(src).toMatch("readPersistedPlan");
    expect(src).toMatch("const confirmed = await readPersistedPlan");
    const persistAt = src.indexOf("const persist = await persistSubscriptionPlan");
    const rereadAt = src.indexOf("const confirmed = await readPersistedPlan");
    const cacheAt = src.indexOf("cachePlan(clerkUserId, confirmed)");
    expect(rereadAt).toBeGreaterThan(persistAt);
    expect(cacheAt).toBeGreaterThan(rereadAt);
  });

  it("plan cards do not write an optimistic browser plan", () => {
    const catalog = read("src/components/subscription/PlanCatalog.tsx");
    const modal = read("src/components/subscription/SubscriptionSyncModal.tsx");
    expect(catalog).not.toMatch("setOptimisticPlan");
    expect(modal).not.toMatch("setOptimisticPlan");
    expect(catalog).toMatch("SubscriptionSyncModal");
  });

  it("opens the controlled sync modal instead of redirecting to the dashboard", () => {
    const catalog = read("src/components/subscription/PlanCatalog.tsx");
    const modal = read("src/components/subscription/SubscriptionSyncModal.tsx");
    expect(catalog).toMatch("SubscriptionSyncModal");
    expect(catalog).not.toMatch('router.push("/dashboard")');
    expect(catalog).not.toMatch("/api/subscription/activate");
    expect(modal).toMatch("/api/subscription/activate");
    expect(modal).toMatch("handleSignOut");
    expect(modal).toMatch("result.plan !== targetPlan");
    expect(modal).not.toMatch('result.plan !== "basic"');
  });
});

describe("FIX 2 — /planos hides the current database plan", () => {
  it("exposes a /planos route that uses the shared catalog", () => {
    const src = read("src/app/planos/page.tsx");
    expect(src).toMatch("PlanCatalog");
  });

  it("removes the current plan from the selectable cards", () => {
    expect(getSelectablePlans("basic").map((p) => p.id)).toEqual([
      "professional",
      "business",
      "enterprise",
    ]);
    expect(getSelectablePlans("professional").map((p) => p.id)).not.toContain("professional");
    expect(getSelectablePlans("business").map((p) => p.id)).not.toContain("business");
    expect(getSelectablePlans("enterprise").map((p) => p.id)).not.toContain("enterprise");
    expect(getSelectablePlans(null)).toHaveLength(Object.keys(SUBSCRIPTION_PLANS).length);
  });

  it("shows a loading skeleton instead of an unfiltered plan list", () => {
    const src = read("src/components/subscription/PlanCatalog.tsx");
    expect(src).toMatch("waitingForCurrentPlan");
    expect(src).toMatch("PlanCardSkeleton");
    expect(src).toMatch("planError");
  });
});

describe("FIX 3/8/9 — GeoMap lifecycle", () => {
  it("does not re-initialize the map when center or markers change", () => {
    const src = read("src/components/location/LocationMap.tsx");
    expect(src).toMatch("MapLifecycleManager");
    expect(src).toMatch("[initNonce]");
    expect(src).not.toMatch("}, [initMap]);");
    expect(src).toMatch("lifecycleRef");
  });

  it("discards in-flight initialize after unmount (Strict Mode)", async () => {
    let created = 0;
    let destroyed = 0;
    const manager = new MapLifecycleManager(() => {
      created += 1;
      return {
        id: "test",
        name: "test",
        initialize: () =>
          new Promise((resolve) => {
            setTimeout(resolve, 20);
          }),
        setCenter: () => undefined,
        getCenter: () => DEFAULT_ANGOLA_CENTER,
        setZoom: () => undefined,
        getZoom: () => 6,
        setLayerType: () => undefined,
        getLayerType: () => "map" as const,
        resize: () => undefined,
        addMarker: () => undefined,
        removeMarker: () => undefined,
        clearMarkers: () => undefined,
        fitBounds: () => undefined,
        addUserLocationMarker: () => undefined,
        removeUserLocationMarker: () => undefined,
        destroy: () => {
          destroyed += 1;
        },
      };
    });

    const first = manager.mount(document.createElement("div"), {});
    manager.unmount();
    const result = await first;
    expect(result).toBeNull();
    expect(created).toBe(1);
    expect(destroyed).toBeGreaterThanOrEqual(1);
  });

  it("compares map coordinates by value", () => {
    expect(coordinatesEqual(DEFAULT_ANGOLA_CENTER, { latitude: -12.5, longitude: 17.5 })).toBe(true);
    expect(coordinatesEqual(DEFAULT_ANGOLA_CENTER, { latitude: 0, longitude: 0 })).toBe(false);
  });

  it("MapQuest adapter clears a leftover Leaflet container id", () => {
    const src = read("src/lib/location/providers/mapquest-map.ts");
    expect(src).toMatch("releaseContainer");
    expect(src).toMatch("_leaflet_id");
    expect(src).toMatch("initGeneration");
  });
});

describe("FIX 4 — search_marketplace_services RPC", () => {
  it("grants execute on the existing marketplace search function", () => {
    const src = read("supabase/migrations/20260824000002_026_marketplace_search_rpc_grants.sql");
    expect(src).toMatch("search_marketplace_services");
    expect(src).toMatch("GRANT EXECUTE");
    expect(src).toMatch("anon, authenticated, service_role");
    expect(src).toMatch("NOTIFY pgrst, 'reload schema'");
  });

  it("treats an empty RPC result as valid instead of forcing seed data", () => {
    const src = read("src/lib/services/marketplace-service.ts");
    expect(src).toMatch("isMissingRpcError");
    const searchFn = src.slice(src.indexOf("public static async searchServices"), src.indexOf("High performance fallback"));
    expect(searchFn).toMatch("Array.isArray(data)");
    expect(searchFn).not.toMatch("data.length > 0");
  });
});

describe("FIX 5–7 — /services merged into /agriexpert", () => {
  it("redirects /services to /agriexpert", () => {
    const page = read("src/app/services/page.tsx");
    expect(page).toMatch("redirect(\"/agriexpert?view=servicos\")");
    const config = read("next.config.ts");
    expect(config).toMatch('source: "/services"');
    expect(config).toMatch("/agriexpert?view=servicos");
  });

  it("keeps AgriExpert specialist directory and marketplace discovery together", () => {
    const src = read("src/app/agriexpert/page.tsx");
    expect(src).toMatch("MarketplaceDiscovery");
    expect(src).toMatch("MOCK_EXPERTS");
    expect(src).toMatch("Especialistas");
    expect(src).toMatch("Serviços");
  });

  it("removes /services from normal navigation", () => {
    const navbar = read("src/components/navigation/Navbar.tsx");
    expect(navbar).not.toMatch('href: "/services"');
    const mobile = read("src/components/navigation/MobileBottomNav.tsx");
    expect(mobile).not.toMatch('href: "/services"');
    expect(mobile).toMatch('href: "/agriexpert"');
  });
});

describe("FIX 10 — subscription column protection", () => {
  it("blocks client updates of subscription_plan", () => {
    const src = read("supabase/migrations/20260824000003_027_protect_subscription_plan.sql");
    expect(src).toMatch("protect_subscription_plan_column");
    expect(src).toMatch("subscription_plan can only be changed via server activation");
    expect(src).toMatch("agriconnect.allow_subscription_change");
  });
});

describe("no implicit Basic subscription", () => {
  it("does not insert a Basic plan when bootstrapping a profile", () => {
    const src = read("src/lib/clerk/auth.ts");
    expect(src).not.toMatch(/subscription_plan:\s*["']basic["']/);
    expect(src).toMatch("parseStoredPlan(dbPlan)");
  });

  it("omits subscription_plan from the Clerk webhook upsert", () => {
    const src = read("src/app/api/webhooks/clerk/route.ts");
    expect(src).not.toMatch(/subscription_plan:\s*["']basic["']/);
    expect(src).toMatch("Omit subscription_plan");
  });

  it("makes subscription_plan nullable without converting existing subscribers", () => {
    const src = read("supabase/migrations/20260824000004_028_nullable_subscription_plan.sql");
    expect(src).toMatch("DROP DEFAULT");
    expect(src).toMatch("DROP NOT NULL");
    expect(src).toMatch("subscription_plan IS NULL OR");
    expect(src).not.toMatch(/SET subscription_plan = NULL/);
    expect(src).toMatch("NEW.subscription_plan IS NOT NULL");
  });

  it("locks the Control Panel route behind a stored subscription", () => {
    const src = read("src/app/(dashboard)/layout.tsx");
    expect(src).toMatch("requireControlPanelAccess");
    const server = read("src/lib/authorization/server.ts");
    expect(server).toMatch('redirect("/planos")');
    expect(server).toMatch("control_panel.access");
  });

  it("keeps My Courses available without a Control Panel subscription", () => {
    const studentLayout = read("src/app/(academy-student)/layout.tsx");
    expect(studentLayout).toMatch("requireAuthenticatedStudentAccess");
    expect(studentLayout).not.toMatch("requireControlPanelAccess");
    expect(existsSync(resolve(process.cwd(), "src/app/(academy-student)/dashboard/academy/my-courses/page.tsx"))).toBe(
      true
    );
    expect(existsSync(resolve(process.cwd(), "src/app/(dashboard)/dashboard/academy/my-courses/page.tsx"))).toBe(
      false
    );
  });

  it("sends unsubscribed Control Panel clicks to /planos", () => {
    const src = read("src/components/navigation/ControlPanelLink.tsx");
    expect(src).toMatch('href = unlocked ? "/dashboard" : "/planos"');
    expect(src).toMatch("canAccessControlPanel");
  });

  it("filters the current plan on the homepage catalog as well as /planos", () => {
    const home = read("src/app/page.tsx");
    expect(home).toMatch("PlanCatalog");
    expect(home).not.toMatch("SUBSCRIPTION_PLANS.basic");
    expect(getSelectablePlans(null).map((p) => p.id)).toContain("basic");
    expect(getSelectablePlans("basic").map((p) => p.id)).not.toContain("basic");
  });

  it("does not invent Basic in the process-local subscription cache", () => {
    const src = read("src/lib/subscription/store.ts");
    expect(src).not.toMatch(/plan \|\| current\?\.plan \|\| ["']basic["']/);
  });

  it("does not treat a missing database plan as an error", () => {
    const src = read("src/lib/subscription/use-authoritative-plan.ts");
    expect(src).not.toMatch("!result.plan || result.source");
    expect(src).toMatch("result.source !== \"database\"");
    expect(src).toMatch("parseStoredPlan(result.plan)");
  });
});
