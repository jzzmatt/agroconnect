import { describe, it, expect } from "vitest";
import { DASHBOARD_NAVIGATION } from "@/config/navigation";

describe("Dashboard Navigation & Role Adaptation", () => {
  it("structures all primary navigation sections matching Figma design", () => {
    const sectionTitles = DASHBOARD_NAVIGATION.map((s) => s.title);
    expect(sectionTitles).toContain("Principal");
    expect(sectionTitles).toContain("AgriExpert");
    expect(sectionTitles).toContain("AgriAcademy");
    expect(sectionTitles).toContain("AgriShopping & Vendas");
  });

  it("contains all Figma sidebar items: Meus Serviços, Pedidos de Serviço, Avaliações, Ganhos, Meus Cursos, Estudantes", () => {
    const expertSection = DASHBOARD_NAVIGATION.find((s) => s.title === "AgriExpert");
    expect(expertSection).toBeDefined();
    const expertItems = expertSection?.items.map((i) => i.title);
    expect(expertItems).toContain("Meus Serviços");
    expect(expertItems).toContain("Pedidos de Serviço");
    expect(expertItems).toContain("Avaliações");
    expect(expertItems).toContain("Ganhos");

    const academySection = DASHBOARD_NAVIGATION.find((s) => s.title === "AgriAcademy");
    expect(academySection).toBeDefined();
    const academyItems = academySection?.items.map((i) => i.title);
    expect(academyItems).toContain("Meus Cursos");
    expect(academyItems).toContain("Estudantes");
  });
});
