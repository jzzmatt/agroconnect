import { readFileSync } from "node:fs";
import { describe, expect, it, afterEach } from "vitest";
import {
  DEMO_CATALOG_COUNTS,
  appendDemoPage,
  demoCourseDetailBySlug,
  demoCoursesForPublic,
  demoProductBySlug,
  demoProductsForPublic,
  demoProductsForSeller,
  demoProviderBySlug,
  demoServiceBySlug,
  demoServicesForProvider,
  demoServicesForPublic,
  isDemoCatalogEnabled,
} from "@/demo/catalog";

const FLAG = "NEXT_PUBLIC_AGROCONNECT_DEMO_CATALOG";
const previous = process.env[FLAG];

afterEach(() => {
  if (previous === undefined) delete process.env[FLAG];
  else process.env[FLAG] = previous;
});

describe("removable presentation catalog", () => {
  it("stays hidden unless the flag is exactly true", () => {
    delete process.env[FLAG];
    expect(isDemoCatalogEnabled()).toBe(false);
    expect(demoProductsForPublic({})).toEqual([]);
    expect(demoServicesForPublic({})).toEqual([]);
    expect(demoCoursesForPublic({})).toEqual([]);
    expect(demoProductBySlug("demo-semente-milho-zm521-huambo")).toBeNull();
    expect(demoCourseDetailBySlug("demo-curso-milho-planalto")).toBeNull();

    process.env[FLAG] = "false";
    expect(demoServicesForPublic({})).toEqual([]);
  });

  it("appends a consistent Angola presentation catalog when enabled", () => {
    process.env[FLAG] = "true";
    const products = demoProductsForPublic({});
    const services = demoServicesForPublic({});
    const courses = demoCoursesForPublic({});

    expect(products).toHaveLength(DEMO_CATALOG_COUNTS.products);
    expect(services).toHaveLength(DEMO_CATALOG_COUNTS.services);
    expect(courses).toHaveLength(DEMO_CATALOG_COUNTS.courses);
    expect(DEMO_CATALOG_COUNTS.providers).toBe(3);

    for (const record of [...products, ...services, ...courses]) {
      expect(record.id.startsWith("demo-")).toBe(true);
      expect(record.isDemo).toBe(true);
    }
    expect(new Set(products.map((item) => item.slug)).size).toBe(products.length);
    expect(new Set(services.map((item) => item.slug)).size).toBe(services.length);
    expect(new Set(courses.map((item) => item.slug)).size).toBe(courses.length);

    expect(products.map((item) => item.category_slug).sort()).toEqual([
      "equipamento",
      "fertilizantes",
      "irrigacao",
      "produtos-colhidos",
      "sanidade-animal",
      "sementes",
    ]);
    expect(services.map((item) => item.category_slug).sort()).toEqual([
      "agronomia",
      "assessoria-agricola",
      "irrigacao",
      "maquinaria",
      "transporte",
      "veterinaria",
    ]);

    const course = demoCourseDetailBySlug("demo-curso-milho-planalto");
    expect(course?.sections.length).toBeGreaterThan(0);
    expect(course?.sections.some((section) => section.lessons.length > 0)).toBe(true);
    expect(demoProductBySlug("demo-semente-milho-zm521-huambo")?.price).toBe(28500);
    expect(demoServiceBySlug("demo-visita-agronomica-huambo")?.province_name).toBe("Huambo");
    expect(demoProviderBySlug("demo-cooperativa-planalto")?.municipality_name).toBe("Caála");
    expect(demoProductsForSeller("11111111-1111-4111-8111-111111111111")).toEqual([]);
    expect(demoServicesForProvider("11111111-1111-4111-8111-111111111111")).toEqual([]);
  });

  it("keeps real rows ahead of demo rows and does not repeat them", () => {
    const real = [{ id: "real-1" }, { id: "real-2" }];
    const demo = [{ id: "demo-1" }];
    expect(appendDemoPage(real, 2, demo, 0, 2)).toEqual({ items: real, total: 3 });
    expect(appendDemoPage([], 2, demo, 2, 2)).toEqual({ items: demo, total: 3 });
  });

  it("keeps demo records out of seller management and persistent actions", () => {
    const shopping = readFileSync("src/lib/services/shopping-service.ts", "utf8");
    const courses = readFileSync("src/lib/services/course-service.ts", "utf8");
    const cart = readFileSync("src/lib/services/commerce-service.ts", "utf8");
    const requests = readFileSync("src/lib/services/shopping-actions.ts", "utf8");
    const enrol = readFileSync("src/lib/services/course-actions.ts", "utf8");
    const shell = readFileSync("src/components/dashboard/DashboardShell.tsx", "utf8");
    const navbar = readFileSync("src/components/navigation/Navbar.tsx", "utf8");

    expect(shopping).toContain("visibleDemoProductsForSeller");
    expect(courses.slice(courses.indexOf("listByOwner"), courses.indexOf("listByOwner") + 700)).not.toContain(
      "demoCourses"
    );
    expect(cart).toContain("assertDemoNotPersisted(input.productId)");
    expect(cart).toContain("assertDemoNotPersisted(courseId)");
    expect(requests).toContain("isDemoRecordId(params.productId)");
    expect(enrol).toContain("assertDemoNotPersisted(courseId)");
    expect(shell).toContain("DemoBadge");
    expect(navbar).not.toContain("DemoBadge");
  });
});
