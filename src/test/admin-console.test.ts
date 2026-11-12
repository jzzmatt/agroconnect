import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adminUserIds, isAllowlistedAdmin, sanitizeUserSearch } from "@/lib/admin/allowlist";
import { catalogTable, parseCatalogId, parseCatalogKind, sanitizeCatalogSearch } from "@/lib/admin/catalog-target";
import { buildHealthReport, readHealthInputs } from "@/lib/admin/health";
import { classifyPublicVisit } from "@/lib/analytics/public-visit";
import { decideDemoVisibility, selectDemoRecords } from "@/demo/visibility";
import { demoBucketObjectPath, showcaseRecords } from "@/demo/showcase";

describe("admin console access", () => {
  it("allows only the configured Clerk user ids", () => {
    const previous = process.env.AGROCONNECT_ADMIN_USER_IDS;
    process.env.AGROCONNECT_ADMIN_USER_IDS = " user_one , user_two,";
    expect(adminUserIds()).toEqual(["user_one", "user_two"]);
    expect(isAllowlistedAdmin("user_two")).toBe(true);
    expect(isAllowlistedAdmin("user_three")).toBe(false);
    expect(isAllowlistedAdmin(null)).toBe(false);
    process.env.AGROCONNECT_ADMIN_USER_IDS = "";
    expect(isAllowlistedAdmin("user_one")).toBe(false);
    if (previous === undefined) delete process.env.AGROCONNECT_ADMIN_USER_IDS;
    else process.env.AGROCONNECT_ADMIN_USER_IDS = previous;
  });

  it("protects admin pages and actions on the server and stays out of public navigation", () => {
    const layout = readFileSync("src/app/admin/layout.tsx", "utf8");
    const actions = readFileSync("src/app/admin/actions.ts", "utf8");
    const navbar = readFileSync("src/components/navigation/Navbar.tsx", "utf8");
    const mobile = readFileSync("src/components/navigation/MobileBottomNav.tsx", "utf8");
    const sidebar = readFileSync("src/components/dashboard/Sidebar.tsx", "utf8");
    const navigation = readFileSync("src/config/navigation.ts", "utf8");
    expect(layout).toContain("requireAdmin()");
    expect(actions).toContain("resolveAdminActor()");
    expect(navbar).not.toContain("/admin");
    expect(mobile).not.toContain("/admin");
    expect(sidebar).not.toContain("/admin");
    expect(navigation).not.toContain("/admin");
  });
});

describe("admin catalog removal", () => {
  it("accepts only a product, course, or service and a real record id", () => {
    expect(parseCatalogKind("course")).toBe("course");
    expect(parseCatalogKind("service")).toBe("service");
    expect(parseCatalogKind("provider")).toBe("product");
    expect(parseCatalogKind(undefined)).toBe("product");
    expect(catalogTable("course")).toBe("courses");
    expect(catalogTable("service")).toBe("services");
    expect(catalogTable("product")).toBe("products");
    expect(parseCatalogId("11111111-1111-4111-8111-111111111111")).toBe("11111111-1111-4111-8111-111111111111");
    expect(parseCatalogId("demo-product-milho")).toBeNull();
    expect(parseCatalogId("not-an-id")).toBeNull();
    expect(sanitizeCatalogSearch("milho %_();")).toBe("milho");
    const actions = readFileSync("src/app/admin/actions.ts", "utf8");
    const page = readFileSync("src/app/admin/catalog/page.tsx", "utf8");
    expect(actions).toContain("resolveAdminActor()");
    expect(actions).toContain("removeCatalogItemAction");
    expect(page).toContain("CatalogRemoveButton");
  });
});

describe("admin health", () => {
  it("reports status without secret values", () => {
    const previous = process.env.CLERK_SECRET_KEY;
    process.env.CLERK_SECRET_KEY = "sk_test_super_secret_value";
    const report = buildHealthReport(
      readHealthInputs(true)
    );
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("sk_test_super_secret_value");
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(report.find((check) => check.id === "database")?.status).not.toBeUndefined();
    if (previous === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = previous;
  });
});

describe("visitor statistics", () => {
  const visitorId = "11111111-1111-4111-8111-111111111111";

  it("counts public marketplace routes and drops private or automated requests", () => {
    expect(classifyPublicVisit({ pathname: "/agrishopping/products/milho", visitorId })?.marketplace).toBe("agrishopping");
    expect(classifyPublicVisit({ pathname: "/agriacademy", visitorId })?.marketplace).toBe("agriacademy");
    expect(classifyPublicVisit({ pathname: "/agriservice/consulta", visitorId })?.marketplace).toBe("agriservice");
    expect(classifyPublicVisit({ pathname: "/admin", visitorId })).toBeNull();
    expect(classifyPublicVisit({ pathname: "/api/health/config", visitorId })).toBeNull();
    expect(classifyPublicVisit({ pathname: "/cart", visitorId })).toBeNull();
    expect(classifyPublicVisit({ pathname: "/checkout", visitorId })).toBeNull();
    expect(classifyPublicVisit({ pathname: "/dashboard", visitorId })).toBeNull();
    expect(classifyPublicVisit({ pathname: "/icons/icon-192.png", visitorId })).toBeNull();
    expect(classifyPublicVisit({ pathname: "/agrishopping", visitorId, userAgent: "Googlebot" })).toBeNull();
    expect(classifyPublicVisit({ pathname: "/agrishopping", visitorId: "not-a-uuid" })).toBeNull();
  });

  it("keeps a failed analytics write from affecting the response", () => {
    const route = readFileSync("src/app/api/analytics/visit/route.ts", "utf8");
    expect(route).toContain("catch");
    expect(route).toContain("status: 204");
  });
});

describe("demo batch management", () => {
  it("keeps the database switch ahead of the environment fallback", () => {
    expect(
      decideDemoVisibility({
        envEnabled: true,
        setting: "false",
        batches: [{ id: "batch-1", status: "active" }],
        records: [{ record_key: "demo-product-milho", demo_batch_id: "batch-1", is_demo: true }],
      }).mode
    ).toBe("none");

    const visible = decideDemoVisibility({
      envEnabled: false,
      setting: "true",
      batches: [{ id: "batch-1", status: "active" }],
      records: [
        { record_key: "demo-product-milho", demo_batch_id: "batch-1", is_demo: true },
        { record_key: "demo-product-old", demo_batch_id: "batch-removed", is_demo: true },
        { record_key: "real-product", demo_batch_id: "batch-1", is_demo: false },
      ],
    });
    expect(selectDemoRecords([{ id: "demo-product-milho" }, { id: "real-product" }], visible).map((item) => item.id)).toEqual([
      "demo-product-milho",
    ]);
  });

  it("defines one idempotent showcase and isolated media paths", () => {
    const first = showcaseRecords();
    const second = showcaseRecords();
    expect(first.map((record) => record.recordKey)).toEqual(second.map((record) => record.recordKey));
    expect(new Set(first.map((record) => `${record.recordKind}:${record.recordKey}`)).size).toBe(first.length);
    expect(first.every((record) => record.recordKey.startsWith("demo-"))).toBe(true);
    const media = first.filter((record) => record.recordKind === "media");
    expect(media.length).toBeGreaterThan(0);
    expect(media.every((record) => demoBucketObjectPath(record.mediaPath || "")?.startsWith("agroconnect-showcase/"))).toBe(true);
    expect(demoBucketObjectPath("../products/real.jpg")).toBeNull();
    expect(demoBucketObjectPath("products/real.jpg")).toBeNull();
  });

  it("deletes only demo-tagged batch records", () => {
    const data = readFileSync("src/lib/admin/data.ts", "utf8");
    expect(data).toContain('.eq("is_demo", true)');
    expect(data).not.toContain('.from("products").delete');
    expect(data).not.toContain('.from("profiles").delete');
    expect(data).not.toContain("phone");
    expect(data).not.toContain("whatsapp");
    expect(sanitizeUserSearch("user_2abc")).toBe("user_2abc");
  });
});
