import { describe, it, expect } from "vitest";
import { getDashboardNavigation } from "@/config/navigation";
import { getDictionary } from "@/i18n";

describe("Dashboard Navigation & Role Adaptation", () => {
  it("structures all primary navigation sections matching Figma design", () => {
    const nav = getDashboardNavigation(getDictionary("pt"));
    const sectionTitles = nav.map((s) => s.title);
    expect(sectionTitles).toContain("Principal");
    expect(sectionTitles).toContain("AgriExpert");
    expect(sectionTitles).toContain("AgriAcademy");
    expect(sectionTitles).toContain(getDictionary("pt").navDash.shoppingSales);
  });

  it("contains all Figma sidebar items with locale-aware titles", () => {
    const pt = getDictionary("pt");
    const expertSection = getDashboardNavigation(pt).find((s) => s.pillar === "agriExpert");
    expect(expertSection).toBeDefined();
    const expertHrefs = expertSection?.items.map((i) => i.href);
    expect(expertHrefs).toContain("/dashboard/services");
    expect(expertHrefs).toContain("/dashboard/requests");
    expect(expertSection?.items.map((i) => i.title)).toContain(pt.navDash.myServices);

    const academySection = getDashboardNavigation(pt).find((s) => s.pillar === "agriAcademy");
    expect(academySection?.items.map((i) => i.href)).toContain("/dashboard/academy/my-courses");

    const en = getDictionary("en");
    const enNav = getDashboardNavigation(en);
    expect(enNav.find((s) => s.pillar === "agriShopping")?.title).toBe(en.navDash.shoppingSales);
  });
});
