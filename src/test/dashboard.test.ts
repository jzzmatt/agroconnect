import { describe, it, expect } from "vitest";
import { getDashboardNavigation } from "@/config/navigation";
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
    const expertHrefs = expertSection?.items.map((i) => i.href);
    expect(expertHrefs).toContain("/dashboard/services");
    expect(expertHrefs).toContain("/dashboard/transport");
    expect(expertHrefs).toContain("/dashboard/requests");
    expect(expertSection?.items.map((i) => i.title)).toContain(pt.navDash.myServices);

    const transportRequests = getDashboardNavigation(pt).find(
      (s) => s.title === pt.navDash.transportServiceRequests
    );
    expect(transportRequests?.items.map((i) => i.href)).toEqual([
      "/dashboard/transport/requests/receiving",
      "/dashboard/transport/requests/sending",
    ]);
    expect(transportRequests?.items.map((i) => i.title)).toEqual([
      pt.navDash.receivingRequests,
      pt.navDash.sendingRequests,
    ]);

    const academySection = getDashboardNavigation(pt).find((s) => s.pillar === "agriAcademy");
    expect(academySection?.items.map((i) => i.href)).toEqual([
      "/dashboard/academy",
      "/dashboard/academy/my-courses",
    ]);

    const en = getDictionary("en");
    const enNav = getDashboardNavigation(en);
    expect(enNav.find((s) => s.pillar === "agriShopping")?.title).toBe(en.navDash.shoppingSales);
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
