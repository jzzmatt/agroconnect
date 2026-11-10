import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { getDashboardNavigation, flattenNavItems } from "@/config/navigation";
import { getDictionary } from "@/i18n";
import { can, subjectFromProfile } from "@/lib/authorization";

const REMOVED_SIDEBAR_ROUTES = [
  "/dashboard/services",
  "/dashboard/requests",
  "/dashboard/transport",
  "/dashboard/transport/requests/receiving",
  "/dashboard/transport/requests/sending",
  "/dashboard/expert/reviews",
  "/dashboard/academy/my-courses",
  "/dashboard/products",
  "/dashboard/orders",
  "/dashboard/earnings",
  "/dashboard/product-requests",
  "/agrishopping",
  "/agrilocalizacao",
  "/dashboard/enterprise",
];

describe("Dashboard Navigation & Role Adaptation", () => {
  it("shows exactly the seven seller destinations", () => {
    const pt = getDictionary("pt");
    const en = getDictionary("en");
    const fr = getDictionary("fr");
    const nav = getDashboardNavigation(pt);
    const items = flattenNavItems(nav.flatMap((section) => section.items));

    expect(nav).toHaveLength(1);
    expect(items.map((item) => item.href)).toEqual([
      "/dashboard",
      "/profile",
      "/dashboard/services/new",
      "/dashboard/academy",
      "/dashboard/products/new",
      "/dashboard/whatsapp",
      "/dashboard/notifications",
    ]);
    expect(items.map((item) => item.title)).toEqual([
      pt.navDash.dashboard,
      pt.navDash.myProfile,
      pt.navDash.createService,
      pt.navDash.createCourse,
      pt.navDash.createProduct,
      pt.navDash.whatsappSetup,
      pt.navDash.notificationCenter,
    ]);
    expect(pt.navDash.createService).toBe("+ Criar Serviço");
    expect(pt.navDash.createCourse).toBe("+ Criar Curso");
    expect(pt.navDash.createProduct).toBe("+ Criar Produto");
    expect(pt.navDash.notificationCenter).toBe("Centro de Notificações");
    expect(en.navDash.whatsappSetup).toBe("WhatsApp Setup");
    expect(en.navDash.notificationCenter).toBe("Notification Center");
    expect(fr.navDash.notificationCenter).toBe("Centre de notifications");
    expect(items.some((item) => item.children?.length)).toBe(false);
  });

  it("keeps create and WhatsApp links locked by their existing permissions", () => {
    const items = flattenNavItems(
      getDashboardNavigation(getDictionary("pt")).flatMap((section) => section.items)
    );
    expect(items.find((item) => item.href === "/dashboard/services/new")?.requiredPermission).toBe(
      "service.manage"
    );
    expect(items.find((item) => item.href === "/dashboard/academy")?.requiredPermission).toBe(
      "academy.course.create"
    );
    expect(items.find((item) => item.href === "/dashboard/products/new")?.requiredPermission).toBe(
      "product.create"
    );
    expect(items.find((item) => item.href === "/dashboard/whatsapp")?.requiredPermission).toBe(
      "whatsapp.connect"
    );

    const basic = subjectFromProfile({
      id: "p-basic",
      clerk_user_id: "clerk-basic",
      roles: ["student"],
      account_type: "customer",
      subscription_plan: "basic",
      subscription_status: "active",
    });
    expect(can(basic, "service.manage")).toBe(false);
    expect(can(basic, "academy.course.create")).toBe(false);
    expect(can(basic, "product.create")).toBe(false);
    expect(can(basic, "whatsapp.connect")).toBe(true);

    const sidebar = readFileSync("src/components/dashboard/Sidebar.tsx", "utf8");
    expect(sidebar).toContain('itemLocked ? "/planos"');
    expect(sidebar).toContain("function longestMatchingHref");
    expect(sidebar).toContain("unreadCount");
    expect(sidebar).toContain("motion-safe:animate-pulse");
    expect(sidebar).toContain("useUnreadNotifications");
    expect(readFileSync("src/components/notifications/unread-notifications.tsx", "utf8")).toContain(
      "useReducedMotion"
    );
  });

  it("removes management links from the sidebar without deleting their pages", () => {
    const hrefs = flattenNavItems(
      getDashboardNavigation(getDictionary("pt")).flatMap((section) => section.items)
    )
      .map((item) => item.href)
      .filter(Boolean);
    for (const href of REMOVED_SIDEBAR_ROUTES) {
      expect(hrefs).not.toContain(href);
    }
    expect(existsSync("src/app/(dashboard)/dashboard/orders/page.tsx")).toBe(true);
    expect(existsSync("src/app/(dashboard)/dashboard/requests/page.tsx")).toBe(true);
    expect(existsSync("src/app/(dashboard)/dashboard/transport/requests/receiving/page.tsx")).toBe(true);
    expect(existsSync("src/app/(dashboard)/dashboard/transport/requests/sending/page.tsx")).toBe(true);
    expect(existsSync("src/app/(dashboard)/dashboard/product-requests/page.tsx")).toBe(true);
    expect(existsSync("src/app/(dashboard)/dashboard/earnings/page.tsx")).toBe(true);
    expect(existsSync("src/app/(dashboard)/dashboard/services/page.tsx")).toBe(true);
    expect(existsSync("src/app/(dashboard)/dashboard/products/page.tsx")).toBe(true);
    expect(existsSync("src/app/(academy-student)/dashboard/academy/my-courses/page.tsx")).toBe(true);
    expect(existsSync("src/app/(dashboard)/dashboard/enterprise/page.tsx")).toBe(true);
  });
});
