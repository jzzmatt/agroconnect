import { describe, it, expect, beforeEach } from "vitest";
import {
  CourseService,
  INITIAL_COURSES,
  slugifyCourse,
  formatCoursePrice,
  courseLevelLabel,
} from "@/lib/services/course-service";
import { EnrollmentService } from "@/lib/services/enrollment-service";
import {
  canTransitionCourseStatus,
  isPubliclyVisibleCourseStatus,
  assertCourseStatusTransition,
} from "@/lib/academy/course-lifecycle";
import { can, type CapabilitySubject } from "@/lib/authorization/policy";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import type { CourseStatus } from "@/types/database";

function instructorSubject(plan: "basic" | "professional" | "business" | "enterprise" | null): CapabilitySubject {
  const entitlements = getUserEntitlements({ subscriptionPlan: plan, roles: ["instructor"] });
  return {
    clerkUserId: "user_instructor",
    profileId: "prof-seed-1",
    roles: ["instructor"],
    accountType: "instructor",
    plan: entitlements.plan,
    subscriptionStatus: entitlements.subscription_status,
    entitlements,
  };
}

describe("AGROCONNECT Phase 7 — AgriAcademy LMS Foundation", () => {
  beforeEach(() => {
    EnrollmentService.resetMemoryStore();
    CourseService.resetMemoryStore();
  });

  it("1. Slugify utility produces URL-safe course slugs", () => {
    expect(slugifyCourse("Maneio Intensivo de Gado Bovino")).toBe("maneio-intensivo-de-gado-bovino");
    expect(slugifyCourse("Horticultura Comercial & Rega")).toBe("horticultura-comercial-rega");
  });

  it("2. Publication lifecycle allows valid transitions and blocks invalid ones", () => {
    expect(canTransitionCourseStatus("draft", "published")).toBe(true);
    expect(canTransitionCourseStatus("published", "paused")).toBe(true);
    expect(canTransitionCourseStatus("paused", "published")).toBe(true);
    expect(canTransitionCourseStatus("archived", "published")).toBe(false);
    expect(canTransitionCourseStatus("draft", "paused")).toBe(false);

    expect(() => assertCourseStatusTransition("draft", "paused")).toThrow();
    expect(CourseService.transitionStatus("draft", "published")).toBe("published");
  });

  it("3. Only published courses are publicly visible", () => {
    const statuses: CourseStatus[] = ["draft", "published", "paused", "archived"];
    expect(statuses.filter(isPubliclyVisibleCourseStatus)).toEqual(["published"]);
  });

  it("4. Public catalogue excludes draft and paused courses", async () => {
    const { courses } = await CourseService.searchPublishedCourses();
    expect(courses.length).toBeGreaterThan(0);
    expect(courses.every((course) => course.status === "published")).toBe(true);
    expect(courses.some((course) => course.slug.includes("rascunho"))).toBe(false);
  });

  it("5. Filters published courses by keyword and province", async () => {
    const milho = await CourseService.searchPublishedCourses({ query: "milho" });
    expect(milho.courses.length).toBeGreaterThan(0);
    expect(milho.courses.some((course) => course.title.toLowerCase().includes("milho"))).toBe(true);

    const huambo = await CourseService.searchPublishedCourses({ provinceName: "Huambo" });
    expect(huambo.courses.length).toBeGreaterThan(0);
    expect(huambo.courses.every((course) => course.province_name?.toLowerCase() === "huambo")).toBe(true);
  });

  it("6. Retrieves published course by slug", async () => {
    const course = await CourseService.getPublishedCourseBySlug(
      "horticultura-comercial-rega-gota-a-gota"
    );
    expect(course).not.toBeNull();
    expect(course?.status).toBe("published");
    expect(course?.instructor_name).toContain("Maria");
  });

  it("7. Provider slug contract returns published courses for that provider", async () => {
    const { courses } = await CourseService.listPublishedCoursesByProviderSlug("dr-joao-silva");
    expect(courses.length).toBeGreaterThan(0);
    expect(courses.every((course) => course.provider_slug === "dr-joao-silva")).toBe(true);
    expect(courses.every((course) => course.status === "published")).toBe(true);
  });

  it("8. Course ownership is enforced for instructor mutations", async () => {
    const owned = INITIAL_COURSES.find((course) => course.instructor_id === "prof-seed-1" && course.status === "draft");
    expect(owned).toBeDefined();

    const allowed = await CourseService.updateCourse("prof-seed-1", {
      id: owned!.id,
      title: "Avicultura Atualizada",
    });
    expect(allowed.success).toBe(true);
    if (allowed.success) expect(allowed.data.title).toBe("Avicultura Atualizada");

    const denied = await CourseService.updateCourse("prof-seed-2", {
      id: owned!.id,
      title: "Tentativa não autorizada",
    });
    expect(denied.success).toBe(false);
    if (!denied.success) expect(denied.code).toBe("UNAUTHORIZED");
    expect(CourseService.isCourseOwner(owned!, "prof-seed-1")).toBe(true);
    expect(CourseService.canInstructorManageCourse(owned!, "prof-seed-2")).toBe(false);
  });

  it("9. Instructor authorization gates academy course capabilities by plan", () => {
    const basicInstructor = instructorSubject("basic");
    const proInstructor = instructorSubject("professional");

    expect(can(basicInstructor, "academy.view")).toBe(true);
    expect(can(basicInstructor, "academy.course.create")).toBe(false);
    expect(can(proInstructor, "academy.course.create")).toBe(true);
    expect(can(proInstructor, "academy.course.publish")).toBe(true);
    expect(can(proInstructor, "academy.students.view")).toBe(true);
  });

  it("10. Enrollment foundation supports enroll, list and unenroll", async () => {
    const courseId = INITIAL_COURSES[0].id;
    const studentId = "student-test-1";

    const enrollment = await EnrollmentService.enroll(studentId, courseId);
    expect(enrollment.status).toBe("active");
    expect(await EnrollmentService.isEnrolled(studentId, courseId)).toBe(true);

    const mine = await EnrollmentService.listByStudent(studentId);
    expect(mine.some((item) => item.course_id === courseId)).toBe(true);

    const byCourse = await EnrollmentService.listByCourse(courseId);
    expect(byCourse.some((item) => item.student_id === studentId)).toBe(true);

    expect(await EnrollmentService.unenroll(studentId, courseId)).toBe(true);
    expect(await EnrollmentService.isEnrolled(studentId, courseId)).toBe(false);
  });

  it("11. Course presentation helpers format price and level labels", () => {
    expect(formatCoursePrice(45000)).toBe("45.000 Kz");
    expect(formatCoursePrice(0)).toBe("Gratuito");
    expect(courseLevelLabel("beginner")).toBe("Iniciante");
    expect(courseLevelLabel("intermediate")).toBe("Intermédio");
  });

  it("12. Create course starts in draft state with instructor ownership", async () => {
    const created = await CourseService.createCourse("prof-seed-2", {
      title: "Gestão de Solos Tropicais",
      provinceName: "Benguela",
      price: 30000,
    });
    expect(created.status).toBe("draft");
    expect(created.owner_id).toBe("prof-seed-2");
    expect(created.slug).toBe("gestao-de-solos-tropicais");
  });
});
