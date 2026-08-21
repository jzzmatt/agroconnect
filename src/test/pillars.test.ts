import { describe, it, expect } from "vitest";
import { MOCK_EXPERTS, MOCK_COURSES, MOCK_PRODUCTS, MOCK_MAP_MARKERS } from "@/config/mock-data";

describe("Marketing & Product Pillar Data Models", () => {
  it("structures mock AgriExpert data with complete fields", () => {
    expect(MOCK_EXPERTS.length).toBeGreaterThanOrEqual(4);
    const expert = MOCK_EXPERTS[0];
    expect(expert.name).toBe("Dr. João Silva");
    expect(expert.provinceName).toBe("Huambo");
    expect(expert.hourlyRate).toBeDefined();
    expect(expert.verified).toBe(true);
  });

  it("structures mock AgriAcademy data with complete fields", () => {
    expect(MOCK_COURSES.length).toBeGreaterThanOrEqual(4);
    const course = MOCK_COURSES[0];
    expect(course.title).toContain("Maneio Intensivo");
    expect(course.durationHours).toBeGreaterThan(0);
    expect(course.lessonsCount).toBeGreaterThan(0);
  });

  it("structures mock AgriShopping data with complete fields", () => {
    expect(MOCK_PRODUCTS.length).toBeGreaterThanOrEqual(4);
    const product = MOCK_PRODUCTS[0];
    expect(product.sellerName).toBe("Agro Comercial Angola");
    expect(product.priceFormatted).toContain("Kz");
  });

  it("provides geographic map markers for all 3 pillars and platform capabilities", () => {
    const categories = MOCK_MAP_MARKERS.map((m) => m.category);
    expect(categories).toContain("expert");
    expect(categories).toContain("academy");
    expect(categories).toContain("shopping");
  });
});
