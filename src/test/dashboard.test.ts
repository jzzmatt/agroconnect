import { describe, it, expect } from "vitest";
import { DASHBOARD_NAVIGATION } from "@/config/navigation";

describe("Dashboard Navigation & Role Adaptation", () => {
  it("structures all primary navigation sections with proper pillars", () => {
    const pillars = DASHBOARD_NAVIGATION.map((s) => s.pillar).filter(Boolean);
    expect(pillars).toContain("agriAcademy");
    expect(pillars).toContain("agriExpert");
    expect(pillars).toContain("agriShopping");
  });

  it("restricts specialized sections to specific user roles", () => {
    const expertSection = DASHBOARD_NAVIGATION.find((s) => s.title.includes("AgriExpert"));
    expect(expertSection?.roles).toContain("expert");
    expect(expertSection?.roles).toContain("veterinarian");
    expect(expertSection?.roles).toContain("agronomist");

    const sellerSection = DASHBOARD_NAVIGATION.find((s) => s.title.includes("AgriShopping"));
    expect(sellerSection?.roles).toContain("seller");

    const academySection = DASHBOARD_NAVIGATION.find((s) => s.title.includes("Instrutor"));
    expect(academySection?.roles).toContain("instructor");
  });
});
