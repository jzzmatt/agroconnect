import { afterEach, describe, expect, it } from "vitest";
import { parseCoursePrice } from "@/lib/academy/course-price";
import { CourseService } from "@/lib/services/course-service";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

describe("instructor course price", () => {
  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  });

  it("accepts zero and positive kwanza amounts and rejects anything else", () => {
    expect(parseCoursePrice(0)).toEqual({ ok: true, price: 0 });
    expect(parseCoursePrice("15000")).toEqual({ ok: true, price: 15000 });
    expect(parseCoursePrice("15000,50")).toEqual({ ok: true, price: 15000.5 });
    expect(parseCoursePrice(" 2500.5 ")).toEqual({ ok: true, price: 2500.5 });
    expect(parseCoursePrice("")).toEqual({ ok: false });
    expect(parseCoursePrice(" ")).toEqual({ ok: false });
    expect(parseCoursePrice("-1")).toEqual({ ok: false });
    expect(parseCoursePrice(-10)).toEqual({ ok: false });
    expect(parseCoursePrice("abc")).toEqual({ ok: false });
    expect(parseCoursePrice("15.000")).toEqual({ ok: false });
    expect(parseCoursePrice(Number.NaN)).toEqual({ ok: false });
  });

  it("persists an entered price on the course and keeps a second completion on the same record", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder-agroconnect.supabase.co";
    const ownerId = `owner-price-${Date.now()}`;
    const created = await CourseService.createCourse(ownerId, {
      title: "Curso de milho",
      description: "Formação",
    });
    expect(created.price_confirmed).toBe(false);

    const rejected = await CourseService.updateCourse(ownerId, {
      id: created.id,
      price: -5,
      confirmPrice: true,
      status: "published",
    });
    expect(rejected.success).toBe(false);
    const unchanged = await CourseService.getOwnedCourse(ownerId, created.id);
    expect(unchanged.success && unchanged.data.price).toBe(0);
    expect(unchanged.success && unchanged.data.price_confirmed).toBe(false);
    expect(unchanged.success && unchanged.data.status).toBe("draft");

    const published = await CourseService.updateCourse(ownerId, {
      id: created.id,
      price: 0,
      confirmPrice: true,
      status: "published",
    });
    expect(published.success).toBe(true);
    if (!published.success) return;
    expect(published.data.price).toBe(0);
    expect(published.data.price_confirmed).toBe(true);
    expect(published.data.status).toBe("published");
    expect(published.data.currency).toBe("AOA");

    const again = await CourseService.updateCourse(ownerId, {
      id: created.id,
      price: 18000,
      confirmPrice: true,
      status: "published",
    });
    expect(again.success).toBe(true);
    if (!again.success) return;
    expect(again.data.id).toBe(created.id);
    expect(again.data.price).toBe(18000);
    expect(again.data.status).toBe("published");
  });
});
