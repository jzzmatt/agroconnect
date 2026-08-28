import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { getDashboardNavigation, flattenNavItems } from "@/config/navigation";
import { getDictionary } from "@/i18n";

describe("Dashboard Navigation & Role Adaptation", () => {
  it("structures all primary navigation sections matching Figma design", () => {
    const nav = getDashboardNavigation(getDictionary("pt"));
    const sectionTitles = nav.map((s) => s.title);
    expect(sectionTitles).toContain("Principal");
    expect(sectionTitles).toContain("AgriService");
    expect(sectionTitles).toContain("AgriAcademy");
    expect(sectionTitles).toContain(getDictionary("pt").navDash.shoppingSales);
  });

  it("contains all Figma sidebar items with locale-aware titles", () => {
    const pt = getDictionary("pt");
    const expertSection = getDashboardNavigation(pt).find((s) => s.pillar === "agriExpert");
    expect(expertSection).toBeDefined();
    expect(expertSection?.title).toBe("AgriService");
    expect(expertSection?.items.map((i) => i.title)).toEqual([
      pt.navDash.myServices,
      pt.navDash.serviceRequests,
      pt.navDash.myTransport,
      pt.navDash.transportMessages,
      pt.navDash.reviews,
    ]);
    const expertHrefs = flattenNavItems(expertSection?.items || [])
      .map((i) => i.href)
      .filter(Boolean);
    expect(expertHrefs).toEqual([
      "/dashboard/services",
      "/dashboard/requests",
      "/dashboard/transport",
      "/dashboard/transport/requests/receiving",
      "/dashboard/transport/requests/sending",
      "/dashboard/expert/reviews",
    ]);

    const messages = expertSection?.items.find((item) => item.title === pt.navDash.transportMessages);
    expect(messages?.href).toBeUndefined();
    expect(messages?.children?.map((item) => item.href)).toEqual([
      "/dashboard/transport/requests/receiving",
      "/dashboard/transport/requests/sending",
    ]);
    const receiving = messages?.children?.find((item) => item.href === "/dashboard/transport/requests/receiving");
    const sending = messages?.children?.find((item) => item.href === "/dashboard/transport/requests/sending");
    expect(receiving?.requiredPermission).toBe("service.manage");
    expect(receiving?.neverLock).toBeUndefined();
    expect(sending?.neverLock).toBe(true);

    const sectionTitles = getDashboardNavigation(pt).map((s) => s.title);
    expect(sectionTitles).not.toContain(pt.navDash.transportServiceRequests);
    expect(getDashboardNavigation(pt).filter((s) => s.pillar === "agriExpert")).toHaveLength(1);

    const academySection = getDashboardNavigation(pt).find((s) => s.pillar === "agriAcademy");
    expect(academySection?.items.map((i) => i.href)).toEqual([
      "/dashboard/academy",
      "/dashboard/academy/my-courses",
    ]);

    const en = getDictionary("en");
    const enNav = getDashboardNavigation(en);
    expect(enNav.find((s) => s.pillar === "agriShopping")?.title).toBe(en.navDash.shoppingSales);
  });

  it("activates the longer AgriService request route instead of Transport", () => {
    const sidebar = readFileSync("src/components/dashboard/Sidebar.tsx", "utf8");
    expect(sidebar).toContain("function pathMatchesHref");
    expect(sidebar).toContain("longestMatchingHref");
    expect(sidebar).toContain("href.length > best.length");
    expect(sidebar).toContain("item.children");
    expect(sidebar).toContain("groupOpen");
  });

  it("keeps product creation on the Produtos page instead of a sidebar duplicate", () => {
    const pt = getDictionary("pt");
    const shopping = getDashboardNavigation(pt).find((s) => s.pillar === "agriShopping");
    const hrefs = shopping?.items.map((item) => item.href) ?? [];
    const titles = shopping?.items.map((item) => item.title) ?? [];

    expect(hrefs).toContain("/dashboard/products");
    expect(titles).toContain(pt.navDash.myProducts);
    expect(hrefs).not.toContain("/dashboard/products/new");
    expect(titles).not.toContain(pt.navDash.addProduct);
  });
});
