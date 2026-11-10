import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Phase 2A buyer hub access", () => {
  it("keeps /orders and /dashboard signed-in and Mercado public", () => {
    const middleware = read("src/middleware.ts");
    const publicRoutes = middleware.slice(
      middleware.indexOf("const isPublicRoute"),
      middleware.indexOf("const clerkHandler")
    );
    expect(publicRoutes).not.toMatch(/"\/orders/);
    expect(publicRoutes).not.toMatch(/"\/dashboard/);
    expect(publicRoutes).toMatch('"/agriservice(.*)"');
    expect(publicRoutes).toMatch('"/agriacademy(.*)"');
    expect(publicRoutes).toMatch('"/agrishopping(.*)"');
  });

  it("links My Purchases to the existing /orders route", () => {
    const navbar = read("src/components/navigation/Navbar.tsx");
    const mobile = read("src/components/navigation/MobileBottomNav.tsx");
    const hub = read("src/app/orders/page.tsx");
    expect(navbar).toContain('href="/orders"');
    expect(navbar).toContain("navigation.myPurchases");
    expect(mobile).toContain('href="/orders"');
    expect(mobile).toContain('href="/dashboard"');
    expect(mobile).toContain('href: "/agriservice"');
    expect(hub).toContain("getCustomerOrdersAction");
    expect(hub).toContain("listMyEnrolledCoursesAction");
    expect(hub).toContain("getCustomerRequestsAction");
    expect(hub).not.toMatch(/saved card|payment method storage|Cards/i);
  });
});
