import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CommerceService } from "@/lib/services/commerce-service";
import { CourseService } from "@/lib/services/course-service";
import { EnrollmentService } from "@/lib/services/enrollment-service";
import { completeAcademyCoursePurchase } from "@/lib/commerce/academy-purchase";
import {
  getPublishedCourseForCommerce,
  grantEnrollmentForCommerce,
} from "@/lib/academy/commerce-contract";
import { resolveLearnAccess } from "@/lib/academy/learn-access";
import { canAccessLessonVideo } from "@/lib/academy/video-playback";

const COMMERCE_SOURCE_ROOTS = [
  "src/lib/services/commerce-service.ts",
  "src/lib/services/commerce-actions.ts",
  "src/types/commerce.ts",
  "src/lib/commerce",
];

function readCommerceSources(): { path: string; source: string }[] {
  const files: { path: string; source: string }[] = [];
  const visit = (path: string) => {
    if (!existsSync(path)) return;
    try {
      const dirents = readdirSync(path, { withFileTypes: true });
      for (const dirent of dirents) {
        visit(join(path, dirent.name));
      }
    } catch {
      if (path.endsWith(".ts") || path.endsWith(".tsx")) {
        files.push({ path, source: readFileSync(path, "utf8") });
      }
    }
  };
  for (const root of COMMERCE_SOURCE_ROOTS) visit(root);
  return files;
}

describe("AGROCONNECT Phase 11 — Commerce Academy boundary", () => {
  beforeEach(async () => {
    EnrollmentService.resetMemoryStore();
    CourseService.resetMemoryStore();
    await CommerceService.clearCart();
  });

  it("keeps Commerce free of Bunny, YouTube playback and Academy video storage", () => {
    const sources = readCommerceSources();
    expect(sources.length).toBeGreaterThan(0);
    for (const file of sources) {
      expect(file.source).not.toMatch(/bunny(\.net|_stream|_video|cdn)?/i);
      expect(file.source).not.toMatch(/youtube/i);
      expect(file.source).not.toContain("video-playback");
      expect(file.source).not.toContain("learn-access");
      expect(file.source).not.toContain("YouTubePlayer");
      expect(file.source).not.toContain("academy_videos");
    }

    const cartAndOrders = readFileSync("src/lib/services/commerce-service.ts", "utf8");
    expect(cartAndOrders).not.toContain("EnrollmentService");
    expect(cartAndOrders).not.toContain("course_enrollments");
  });

  it("does not add Academy courses or video assets to the product cart", async () => {
    await expect(CommerceService.addToCart({ productId: "crs-seed-1" })).rejects.toThrow(
      /Produto não encontrado/
    );
    await expect(CommerceService.addToCart({ productId: "bunny-secret" })).rejects.toThrow(
      /Produto não encontrado/
    );
    const cart = await CommerceService.getCart();
    expect(cart.items).toEqual([]);
  });

  it("exposes only Course, Enrollment and User through the Academy commerce contract", async () => {
    const published = await getPublishedCourseForCommerce("crs-seed-1");
    expect(published).toEqual({
      id: "crs-seed-1",
      title: "Maneio Intensivo e Nutrição de Gado Bovino em Angola",
      slug: "maneio-intensivo-nutricao-gado-bovino-angola",
      price: 45000,
      currency: "AOA",
    });
    expect(published && "youtube_video_id" in published).toBe(false);
    expect(JSON.stringify(published)).not.toMatch(/youtube|bunny/i);

    expect(await getPublishedCourseForCommerce("crs-seed-draft")).toBeNull();
  });

  it("grants paid-course enrollment through the existing Enrollment model", async () => {
    const result = await completeAcademyCoursePurchase({
      studentId: "cust-demo-1",
      courseId: "crs-seed-1",
    });

    expect(result.studentId).toBe("cust-demo-1");
    expect(result.courseId).toBe("crs-seed-1");
    expect(result.enrollmentId).toBeTruthy();

    const enrollments = await EnrollmentService.listByStudent("cust-demo-1");
    expect(enrollments).toHaveLength(1);
    expect(enrollments[0]?.course_id).toBe("crs-seed-1");
    expect(enrollments[0]?.status).toBe("active");

    const again = await grantEnrollmentForCommerce("cust-demo-1", "crs-seed-1");
    expect(again.id).toBe(result.enrollmentId);

    await expect(
      completeAcademyCoursePurchase({ studentId: "cust-demo-1", courseId: "crs-seed-draft" })
    ).rejects.toThrow(/não está disponível/);
  });

  it("leaves lesson playback under Academy enrollment authorization", () => {
    expect(canAccessLessonVideo({ courseStatus: "published", isEnrolled: false, isOwner: false })).toBe(
      false
    );
    expect(canAccessLessonVideo({ courseStatus: "published", isEnrolled: true, isOwner: false })).toBe(
      true
    );

    const denied = resolveLearnAccess({
      course: {
        id: "crs-seed-1",
        owner_id: "prof-seed-1",
        title: "Curso",
        slug: "curso",
        description: "Desc",
        level: "beginner",
        price: 0,
        currency: "AOA",
        status: "published",
        lessons_count: 1,
        students_count: 0,
        is_featured: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sections: [
          {
            id: "sec-1",
            course_id: "crs-seed-1",
            title: "Capítulo",
            sort_order: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            lessons: [
              {
                id: "les-1",
                course_id: "crs-seed-1",
                section_id: "sec-1",
                title: "Aula",
                sort_order: 1,
                youtube_video_id: "dQw4w9WgXcQ",
                is_free_preview: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          },
        ],
      },
      profileId: "cust-demo-1",
      enrolled: false,
      isOwner: false,
    });
    expect(denied.allowed).toBe(false);
    if (!denied.allowed) expect(denied.reason).toBe("not_enrolled");
  });

  it("does not add YouTube or Academy video-storage financial fields to Commerce types", () => {
    const types = readFileSync("src/types/commerce.ts", "utf8");
    expect(types).toContain("PaymentRecordDescriptor");
    expect(types).not.toMatch(/youtube/i);
    expect(types).not.toMatch(/bunny/i);
    expect(types).not.toContain("video_storage");
    expect(existsSync("src/lib/services/enrollment-service.ts")).toBe(true);
    expect(existsSync("src/lib/commerce/academy-purchase.ts")).toBe(true);
  });
});
