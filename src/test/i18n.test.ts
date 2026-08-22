import { describe, it, expect } from "vitest";
import { getDictionary } from "@/i18n";
import { defaultLocale, supportedLocales } from "@/i18n/config";

describe("Internationalization (i18n) Engine", () => {
  it("defaults to Portuguese (pt)", () => {
    expect(defaultLocale).toBe("pt");
    expect(supportedLocales).toContain("pt");
  });

  it("provides complete Portuguese dictionary with official naming", () => {
    const dict = getDictionary("pt");
    expect(dict.common.brandName).toBe("AGROCONNECT");
    expect(dict.navigation.agriExpert).toBe("AgriExpert");
    expect(dict.navigation.agriAcademy).toBe("AgriAcademy");
    expect(dict.navigation.agriShopping).toBe("AgriShopping");
    expect(dict.navigation.agriLocalizacao).toBe("AgriLocalização");
    expect(dict.navigation.dashboard).toBe("Painel");
    expect(dict.roles.veterinarian).toBe("Veterinário");
    expect(dict.roles.agronomist).toBe("Agrónomo");
    expect(dict.roles.agricultural_consultant).toBe("Consultor Agrícola");
    expect(dict.entities.province).toBe("Província");
    expect(dict.entities.municipality).toBe("Município");
    expect(dict.entities.commune).toBe("Comuna");
  });

  it("provides complete English dictionary as fallback/extensibility", () => {
    const dict = getDictionary("en");
    expect(dict.common.brandName).toBe("AGROCONNECT");
    expect(dict.navigation.agriExpert).toBe("AgriExpert");
    expect(dict.navigation.agriAcademy).toBe("AgriAcademy");
    expect(dict.navigation.agriShopping).toBe("AgriShopping");
    expect(dict.navigation.agriLocalizacao).toBe("AgriLocalização");
    expect(dict.navigation.dashboard).toBe("Dashboard");
    expect(dict.roles.veterinarian).toBe("Veterinarian");
  });

  it("falls back to default locale dictionary when given invalid locale", () => {
    const dict = getDictionary("xx");
    expect(dict.navigation.dashboard).toBe("Painel");
  });

  it("provides French dictionary", () => {
    const dict = getDictionary("fr");
    expect(dict.navigation.dashboard).toBe("Tableau de bord");
    expect(dict.glossary.order).toBe("Commande");
  });

  it("switches visible marketing copy between locales", () => {
    const pt = getDictionary("pt");
    const en = getDictionary("en");
    const fr = getDictionary("fr");

    expect(pt.landing.ctaPrimary).toBe("Começar agora");
    expect(en.landing.ctaPrimary).toBe("Get started");
    expect(fr.landing.ctaPrimary).toBe("Commencer maintenant");
    expect(pt.pricing.plans.professional.name).toBe("Profissional");
    expect(en.pricing.plans.professional.name).toBe("Professional");
    expect(fr.pricing.plans.professional.name).toBe("Professionnel");
  });
});
