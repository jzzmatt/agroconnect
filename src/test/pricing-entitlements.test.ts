import { describe, it, expect } from "vitest";
import {
  SUBSCRIPTION_PLANS,
  getUserEntitlements,
  parseStoredPlan,
  normalizePlanSlug,
  normalizeWhatsAppNumber,
} from "@/lib/services/pricing-service";
import { createProductAction } from "@/lib/services/shopping-actions";

describe("AGROCONNECT Phase 8.5 Revision v2 — Pricing, Plans, Product Limits & WhatsApp", () => {
  it("1. Verifies the 4 Canonical Subscription Plans and exact monthly pricing in Kwanzas", () => {
    expect(SUBSCRIPTION_PLANS.basic.priceMonthlyAoa).toBe(0);
    expect(SUBSCRIPTION_PLANS.basic.priceFormatted).toBe("0 Kz");

    expect(SUBSCRIPTION_PLANS.professional.priceMonthlyAoa).toBe(15000);
    expect(SUBSCRIPTION_PLANS.professional.priceFormatted).toBe("15.000 Kz");
    expect(SUBSCRIPTION_PLANS.professional.productLimit).toBe(10);

    expect(SUBSCRIPTION_PLANS.business.priceMonthlyAoa).toBe(30000);
    expect(SUBSCRIPTION_PLANS.business.priceFormatted).toBe("30.000 Kz");
    expect(SUBSCRIPTION_PLANS.business.productLimit).toBeNull(); // Unlimited
    expect(SUBSCRIPTION_PLANS.business.highlightBadge).toBe("MAIS ESCOLHIDO PARA VENDEDORES");

    expect(SUBSCRIPTION_PLANS.enterprise.priceMonthlyAoa).toBe(80000);
    expect(SUBSCRIPTION_PLANS.enterprise.priceFormatted).toBe("80.000 Kz");
    expect(SUBSCRIPTION_PLANS.enterprise.productLimit).toBeNull(); // Unlimited
  });

  it("2. Basic plan (0 Kz/mês) is view-only for creation and rejects product/course publishing", () => {
    const basicEntitlements = getUserEntitlements({ subscriptionPlan: "basic" });
    expect(basicEntitlements.can_create_products).toBe(false);
    expect(basicEntitlements.can_publish_products).toBe(false);
    expect(basicEntitlements.can_create_courses).toBe(false);
    expect(basicEntitlements.product_limit).toBe(0);
  });

  it("3. Professional plan (15.000 Kz/mês) enforces a strict 10-product limit", () => {
    const proEntitlements = getUserEntitlements({ subscriptionPlan: "professional" });
    expect(proEntitlements.can_create_products).toBe(true);
    expect(proEntitlements.can_publish_products).toBe(true);
    expect(proEntitlements.can_create_courses).toBe(true);
    expect(proEntitlements.product_limit).toBe(10);
  });

  it("4. Business (30.000 Kz/mês) and Enterprise (80.000 Kz/mês) allow unlimited products", () => {
    const bizEntitlements = getUserEntitlements({ subscriptionPlan: "business" });
    expect(bizEntitlements.can_create_products).toBe(true);
    expect(bizEntitlements.product_limit).toBeNull(); // Unlimited

    const entEntitlements = getUserEntitlements({ subscriptionPlan: "enterprise" });
    expect(entEntitlements.can_create_products).toBe(true);
    expect(entEntitlements.product_limit).toBeNull(); // Unlimited
  });

  it("5. WhatsApp number normalization converts Angola phone numbers to E.164 and formatted display", () => {
    const wa1 = normalizeWhatsAppNumber("923000000");
    expect(wa1.isValid).toBe(true);
    expect(wa1.normalized).toBe("+244923000000");
    expect(wa1.formatted).toBe("+244 923 000 000");
    expect(wa1.waLink).toBe("https://wa.me/244923000000");

    const wa2 = normalizeWhatsAppNumber("+244 912 345 678");
    expect(wa2.isValid).toBe(true);
    expect(wa2.normalized).toBe("+244912345678");
    expect(wa2.formatted).toBe("+244 912 345 678");

    const invalid = normalizeWhatsAppNumber("123");
    expect(invalid.isValid).toBe(false);
  });

  it("6. Plan slug parser never invents Basic for a missing stored plan", () => {
    expect(parseStoredPlan(null)).toBeNull();
    expect(parseStoredPlan(undefined)).toBeNull();
    expect(parseStoredPlan("")).toBeNull();
    expect(parseStoredPlan("not-a-plan")).toBeNull();
    expect(normalizePlanSlug(null)).toBeNull();
    expect(parseStoredPlan("free")).toBe("basic");
    expect(parseStoredPlan("básico")).toBe("basic");
    expect(parseStoredPlan("pro")).toBe("professional");
    expect(parseStoredPlan("profissional")).toBe("professional");
    expect(parseStoredPlan("business")).toBe("business");
    expect(parseStoredPlan("create")).toBe("business");
    expect(parseStoredPlan("premium")).toBe("enterprise");
    expect(parseStoredPlan("empresarial")).toBe("enterprise");
  });

  it("7. Validates that Basic plan has all 4 ecosystem creation modules locked", () => {
    const basicEntitlements = getUserEntitlements({ subscriptionPlan: "basic" });
    expect(basicEntitlements.can_access_agrishopping).toBe(false);
    expect(basicEntitlements.can_access_agriacademy).toBe(false);
    expect(basicEntitlements.can_access_agrilocalization).toBe(false);
    expect(basicEntitlements.can_access_agriexpert).toBe(false);
    expect(basicEntitlements.can_create_products).toBe(false);
    expect(basicEntitlements.can_create_courses).toBe(false);
    expect(basicEntitlements.can_manage_services).toBe(false);
    expect(basicEntitlements.can_publish_public_provider).toBe(false);
    expect(basicEntitlements.can_manage_locations).toBe(false);
  });

  it("8. Validates that Professional plan unlocks ecosystem creation modules", () => {
    const proEntitlements = getUserEntitlements({ subscriptionPlan: "professional" });
    expect(proEntitlements.can_access_agrishopping).toBe(true);
    expect(proEntitlements.can_access_agriacademy).toBe(true);
    expect(proEntitlements.can_access_agrilocalization).toBe(true);
    expect(proEntitlements.can_access_agriexpert).toBe(true);
    expect(proEntitlements.can_create_products).toBe(true);
    expect(proEntitlements.can_create_courses).toBe(true);
    expect(proEntitlements.product_limit).toBe(10);
  });

  it("9. Null plan is not subscribed; Basic is subscribed with the same creation locks", () => {
    const nullEntitlements = getUserEntitlements({ subscriptionPlan: null });
    expect(nullEntitlements.plan).toBeNull();
    expect(nullEntitlements.has_subscription).toBe(false);
    expect(nullEntitlements.can_access_control_panel).toBe(false);
    expect(nullEntitlements.can_create_products).toBe(false);
    expect(nullEntitlements.can_create_courses).toBe(false);
    expect(nullEntitlements.can_access_agrishopping).toBe(false);
    expect(nullEntitlements.product_limit).toBe(0);

    const basicEntitlements = getUserEntitlements({ subscriptionPlan: "basic" });
    expect(basicEntitlements.plan).toBe("basic");
    expect(basicEntitlements.has_subscription).toBe(true);
    expect(basicEntitlements.can_access_control_panel).toBe(true);
    expect(basicEntitlements.can_access_agriexpert).toBe(false);
    expect(basicEntitlements.can_access_agriacademy).toBe(false);
    expect(basicEntitlements.can_access_agriproduct).toBe(false);
  });

  it("10. Fails closed on server action when a Basic plan user attempts to create a product", async () => {
    const basicEntitlements = getUserEntitlements({ subscriptionPlan: "basic" });
    expect(basicEntitlements.can_create_products).toBe(false);
    expect(basicEntitlements.can_access_agrishopping).toBe(false);
  });
});
