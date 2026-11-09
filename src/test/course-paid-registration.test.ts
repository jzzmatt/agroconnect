import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { canAccessLessonVideo } from "@/lib/academy/video-playback";
import { courseRegistrationPath } from "@/lib/academy/course-registration";
import { getPublishedCourseForCommerce } from "@/lib/academy/commerce-contract";
import { paymentCoversCourseOrder, settlePaidCourseOrder } from "@/lib/commerce/academy-purchase";
import { confirmedReceivedTotal } from "@/lib/commerce/persist";
import {
  addGuestCourse,
  addGuestProduct,
  mergeGuestIntoAccount,
  parseGuestCart,
  serializeGuestCart,
} from "@/lib/commerce/guest-cart";
import { claimGuestLines } from "@/lib/commerce/guest-cart-session";
import { CommerceService } from "@/lib/services/commerce-service";
import { CourseService } from "@/lib/services/course-service";
import { EnrollmentService } from "@/lib/services/enrollment-service";
import { buildCourseCompletionMessage } from "@/lib/whatsapp/course-message";

const LEARNER = "learner-paid";
const COURSE = "crs-seed-1";
const FREE_COURSE = "crs-seed-2";
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const checkoutInput = {
  fulfillmentMethod: "pickup" as const,
  paymentMethod: "mock_sandbox" as const,
};

describe("paid course registration", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder-agroconnect.supabase.co";
    CourseService.resetMemoryStore();
    EnrollmentService.resetMemoryStore();
    CommerceService.resetMemoryStore();
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  });

  it("keeps price changes on the owned course and rejects another instructor", async () => {
    const denied = await CourseService.updateCourse("intruder", {
      id: COURSE,
      price: 10,
      confirmPrice: true,
    });
    expect(denied.success).toBe(false);

    const saved = await CourseService.updateCourse("prof-seed-1", {
      id: COURSE,
      price: 22000,
      confirmPrice: true,
    });
    expect(saved.success).toBe(true);
    const published = await getPublishedCourseForCommerce(COURSE);
    expect(published?.price).toBe(22000);
    expect(published?.currency).toBe("AOA");
  });

  it("keeps free registration on the enrollment path", async () => {
    const saved = await CourseService.updateCourse("prof-seed-2", {
      id: FREE_COURSE,
      price: 0,
      confirmPrice: true,
    });
    expect(saved.success).toBe(true);
    const course = await getPublishedCourseForCommerce(FREE_COURSE);
    expect(courseRegistrationPath(course?.price || 0)).toBe("enroll");

    const enrollment = await EnrollmentService.enroll("learner-free", FREE_COURSE);
    expect(enrollment.status).toBe("active");
    expect(await EnrollmentService.isEnrolled("learner-free", FREE_COURSE)).toBe(true);
    await expect(
      CommerceService.addCatalogCourse(FREE_COURSE, { customerId: "learner-free" })
    ).rejects.toThrow(/não está disponível/);
    expect((await CommerceService.getCart({ customerId: "learner-free" })).items).toEqual([]);
  });

  it("adds a paid course to the cart without granting access", async () => {
    expect(courseRegistrationPath(45000)).toBe("cart");
    const cart = await CommerceService.addCatalogCourse(COURSE, { customerId: LEARNER });
    const again = await CommerceService.addCatalogCourse(COURSE, { customerId: LEARNER });
    expect(cart.items).toHaveLength(1);
    expect(again.items).toHaveLength(1);
    expect(again.items[0]?.quantity).toBe(1);
    expect(again.items[0]?.course_id).toBe(COURSE);
    expect(again.items[0]?.unit_price).toBe(45000);
    expect(again.items[0]?.currency).toBe("AOA");
    expect(await EnrollmentService.isEnrolled(LEARNER, COURSE)).toBe(false);
    expect(
      canAccessLessonVideo({ courseStatus: "published", isEnrolled: false, isOwner: false })
    ).toBe(false);

    const held = await CommerceService.updateCartItemQuantity(COURSE, 4, { customerId: LEARNER });
    expect(held.items[0]?.quantity).toBe(1);
  });

  it("does not grant access for an unpaid, failed, cancelled, or partial payment", async () => {
    const blocked = [
      { paymentStatus: "pending", payments: [{ status: "pending", amount: 45000 }] },
      { paymentStatus: "failed", payments: [{ status: "failed", amount: 45000 }] },
      { paymentStatus: "cancelled", payments: [{ status: "cancelled", amount: 45000 }] },
      { paymentStatus: "paid", payments: [{ status: "paid", amount: 1000 }] },
    ];
    for (const [index, event] of blocked.entries()) {
      const studentId = `learner-blocked-${index}`;
      const result = await settlePaidCourseOrder({
        studentId,
        orderTotal: 45000,
        paymentStatus: event.paymentStatus,
        payments: event.payments,
        courseIds: [COURSE],
      });
      expect(result.enrolledCourseIds).toEqual([]);
      expect(await EnrollmentService.isEnrolled(studentId, COURSE)).toBe(false);
      expect(paymentCoversCourseOrder({ orderTotal: 45000, ...event })).toBe(false);
    }
  });

  it("grants access once after the full payment and ignores a duplicate notice", async () => {
    await CommerceService.addCatalogCourse(COURSE, { customerId: LEARNER });
    expect(await EnrollmentService.isEnrolled(LEARNER, COURSE)).toBe(false);

    const priced = await CourseService.updateCourse("prof-seed-1", {
      id: COURSE,
      price: 22000,
      confirmPrice: true,
    });
    expect(priced.success).toBe(true);

    const result = await CommerceService.checkoutOrder(checkoutInput, { customerId: LEARNER });
    expect(result.order.payment_status).toBe("paid");
    expect(result.order.items[0]?.course_id).toBe(COURSE);
    expect(result.order.items[0]?.product_id).toBeNull();
    expect(result.order.items[0]?.unit_price).toBe(22000);
    expect(result.order.total).toBe(22000);
    expect((await CommerceService.getCart({ customerId: LEARNER })).items).toEqual([]);

    const enrolled = await EnrollmentService.listByStudent(LEARNER);
    expect(enrolled).toHaveLength(1);
    expect(enrolled[0]?.status).toBe("active");
    expect(
      canAccessLessonVideo({
        courseStatus: "published",
        isEnrolled: await EnrollmentService.isEnrolled(LEARNER, COURSE),
        isOwner: false,
      })
    ).toBe(true);

    expect(
      confirmedReceivedTotal(22000, "paid", [
        { status: "paid", amount: 22000 },
        { status: "paid", amount: 22000 },
      ])
    ).toBe(22000);
    const duplicate = await settlePaidCourseOrder({
      studentId: LEARNER,
      orderTotal: 22000,
      paymentStatus: "paid",
      payments: [
        { status: "paid", amount: 22000 },
        { status: "paid", amount: 22000 },
      ],
      courseIds: [COURSE, COURSE],
    });
    expect(duplicate.enrolledCourseIds).toEqual([COURSE]);
    expect(await EnrollmentService.listByStudent(LEARNER)).toHaveLength(1);
    expect((await EnrollmentService.listByStudent(LEARNER))[0]?.id).toBe(enrolled[0]?.id);
  });

  it("keeps the course in the cart across sign-in", async () => {
    const productId = "11111111-1111-4111-8111-111111111111";
    const stored = serializeGuestCart(addGuestCourse(addGuestProduct([], productId, 2), COURSE));
    const parsed = parseGuestCart(stored);
    expect(parsed).toEqual([
      { productId, quantity: 2 },
      { productId: COURSE, courseId: COURSE, quantity: 1 },
    ]);
    expect(mergeGuestIntoAccount(parsed, parsed)).toEqual([
      { productId, quantity: 4 },
      { productId: COURSE, courseId: COURSE, quantity: 1 },
    ]);

    const remaining = await claimGuestLines(LEARNER, parsed.filter((line) => line.courseId));
    expect(remaining).toEqual([]);
    const cart = await CommerceService.getCart({ customerId: LEARNER });
    expect(cart.items.map((item) => item.course_id)).toEqual([COURSE]);
    expect(await EnrollmentService.isEnrolled(LEARNER, COURSE)).toBe(false);

    const checkedOut = await CommerceService.checkoutOrder(checkoutInput, { customerId: LEARNER });
    expect(checkedOut.order.payment_status).toBe("paid");
    expect(await EnrollmentService.isEnrolled(LEARNER, COURSE)).toBe(true);
  });

  it("puts the saved price and course link in WhatsApp without touching access", () => {
    const message = buildCourseCompletionMessage({
      title: "Gestão de milho",
      instructorName: "Ana Lopes",
      price: 15000,
      currency: "AOA",
      courseUrl: "https://www.agroconnect.ao/agriacademy/courses/gestao-de-milho",
    });
    expect(message).toContain("Gestão de milho");
    expect(message).toContain("Ana Lopes");
    expect(message).toContain("15.000 Kz");
    expect(message).toContain("https://www.agroconnect.ao/agriacademy/courses/gestao-de-milho");

    const publisher = readFileSync("src/lib/whatsapp/course-publish-service.ts", "utf8");
    expect(publisher).not.toContain("EnrollmentService");
    expect(publisher).not.toContain("settlePaidCourseOrder");
    expect(publisher).not.toContain("addCatalogCourse");
    const register = readFileSync("src/app/api/academy/courses/[courseId]/register/route.ts", "utf8");
    expect(register).toContain("addCatalogCourse");
    expect(register).toContain("addGuestCourse");
    expect(register).not.toContain("EnrollmentService");
    const enroll = readFileSync("src/app/api/academy/enroll/route.ts", "utf8");
    expect(enroll).toContain("PAYMENT_REQUIRED");
  });
});
