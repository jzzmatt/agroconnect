import { describe, it, expect, beforeEach } from "vitest";
import { getDashboardNavigation } from "@/config/navigation";
import { getDictionary } from "@/i18n";
import { EnrollmentService } from "@/lib/services/enrollment-service";
import { CourseService } from "@/lib/services/course-service";
import { can, subjectFromProfile } from "@/lib/authorization";
import { getUserEntitlements } from "@/lib/services/pricing-service";

describe("AGROCONNECT Phase 7.2 — AgriAcademy Dashboard Refactor", () => {
  beforeEach(() => {
    EnrollmentService.resetMemoryStore();
    CourseService.resetMemoryStore();
  });

  it("1. Exposes Course Creator and My Courses in the Academy sidebar", () => {
    const pt = getDictionary("pt");
    const academy = getDashboardNavigation(pt).find((section) => section.pillar === "agriAcademy");
    expect(academy).toBeDefined();
    const hrefs = academy?.items.map((item) => item.href) ?? [];
    const titles = academy?.items.map((item) => item.title) ?? [];

    expect(hrefs).toEqual(["/dashboard/academy", "/dashboard/academy/my-courses"]);
    expect(titles).toContain(pt.navDash.courseCreator);
    expect(titles).toContain(pt.navDash.myEnrolledCourses);
    expect(hrefs).not.toContain("/dashboard/academy/students");
  });

  it("2. Removes obsolete Videos, Storage and Students nav entries", () => {
    const en = getDictionary("en");
    const academy = getDashboardNavigation(en).find((section) => section.pillar === "agriAcademy");
    const titles = academy?.items.map((item) => item.title) ?? [];
    expect(titles).not.toContain("Videos and storage");
    expect(titles).not.toContain("Students");
    expect(academy?.items).toHaveLength(2);
  });

  it("3. Keeps My Courses unlocked for Basic users via neverLock", () => {
    const academy = getDashboardNavigation(getDictionary("pt")).find(
      (section) => section.pillar === "agriAcademy"
    );
    const myCourses = academy?.items.find((item) => item.href === "/dashboard/academy/my-courses");
    expect(myCourses?.neverLock).toBe(true);
    expect(myCourses?.requiredPermission).toBeUndefined();
  });

  it("4. Requires instructor permission for Course Creator nav item", () => {
    const academy = getDashboardNavigation(getDictionary("pt")).find(
      (section) => section.pillar === "agriAcademy"
    );
    const creator = academy?.items.find((item) => item.href === "/dashboard/academy");
    expect(creator?.requiredPermission).toBe("academy.course.create");
  });

  it("5. Aggregates student counts without per-course waterfalls", async () => {
    const courseA = "crs-seed-1";
    const courseB = "crs-seed-2";
    await EnrollmentService.enroll("student-1", courseA);
    await EnrollmentService.enroll("student-2", courseA);
    await EnrollmentService.enroll("student-3", courseB);

    const counts = await EnrollmentService.countActiveByCourseIds([courseA, courseB, "missing"]);
    expect(counts[courseA]).toBe(2);
    expect(counts[courseB]).toBe(1);
    expect(counts.missing).toBeUndefined();
  });

  it("6. Lists students with enrollment metadata for instructor view", async () => {
    await EnrollmentService.enroll("student-1", "crs-seed-1");
    const students = await EnrollmentService.listStudentsWithProfiles("crs-seed-1");
    expect(students).toHaveLength(1);
    expect(students[0].courseId).toBe("crs-seed-1");
    expect(students[0].enrolledAt).toBeTruthy();
  });

  it("7. Allows any authenticated plan to conceptually access My Courses capability", () => {
    const entitlements = getUserEntitlements({ subscriptionPlan: "basic", roles: ["student"] });
    const basicStudent = subjectFromProfile({
      id: "student-1",
      clerk_user_id: "user_student",
      roles: ["student"],
      account_type: "customer",
      subscription_plan: entitlements.plan,
      subscription_status: entitlements.subscription_status,
    });
    expect(can(basicStudent, "academy.view")).toBe(true);
    expect(can(basicStudent, "academy.course.create")).toBe(false);
  });

  it("8. Resolves enrolled courses by persisted enrollment records", async () => {
    await EnrollmentService.enroll("student-42", "crs-seed-1");
    const enrollments = await EnrollmentService.listByStudent("student-42");
    const courses = await CourseService.getCoursesByIds(enrollments.map((item) => item.course_id));
    expect(courses.some((course) => course.id === "crs-seed-1")).toBe(true);
    expect(courses.some((course) => course.id === "crs-seed-draft")).toBe(false);
  });
});
