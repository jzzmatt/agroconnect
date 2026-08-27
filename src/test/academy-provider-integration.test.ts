import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { CourseService, INITIAL_COURSES } from "@/lib/services/course-service";
import {
  collectForbiddenPublicCourseKeys,
  publishedCourseBelongsToProvider,
  toPublicProviderAcademyCourses,
} from "@/lib/academy/public-provider-courses";
import { listProviderPublishedCoursesAction } from "@/lib/services/course-actions";
import type { CourseListItem } from "@/types/agriacademy";

function asListItem(overrides: Partial<CourseListItem> & { status: CourseListItem["status"] }): CourseListItem {
  return {
    id: "crs-pub",
    title: "Curso público",
    slug: "curso-publico",
    instructor_id: "prof-1",
    instructor_name: "Instrutor",
    instructor_role: "Agrónomo",
    provider_slug: "dr-joao-silva",
    description: "Descrição pública",
    short_description: "Curta",
    level: "beginner",
    price: 0,
    currency: "AOA",
    lessons_count: 4,
    students_count: 12,
    is_featured: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("AGROCONNECT Phase 10 — provider Academy integration", () => {
  beforeEach(() => {
    CourseService.resetMemoryStore();
  });

  it("matches published courses owned by the provider even when provider_id is missing", () => {
    const provider = { id: "prov-1", profileId: "prof-1", slug: "dr-joao-silva" };
    expect(
      publishedCourseBelongsToProvider(
        asListItem({ status: "published", provider_id: null, provider_slug: null, instructor_id: "prof-1" }),
        provider
      )
    ).toBe(true);
    expect(
      publishedCourseBelongsToProvider(
        asListItem({ status: "published", provider_id: "prov-1", provider_slug: null, instructor_id: "other" }),
        provider
      )
    ).toBe(true);
    expect(
      publishedCourseBelongsToProvider(
        asListItem({
          id: "crs-draft",
          status: "draft",
          provider_id: null,
          provider_slug: null,
          instructor_id: "prof-1",
        }),
        provider
      )
    ).toBe(false);
    expect(
      publishedCourseBelongsToProvider(
        asListItem({
          id: "crs-other",
          status: "published",
          provider_id: "prov-other",
          provider_slug: "outro-prestador",
          instructor_id: "prof-other",
        }),
        provider
      )
    ).toBe(false);
  });

  it("returns only published courses for a provider slug", async () => {
    const { courses } = await CourseService.listPublishedCoursesByProviderSlug("dr-joao-silva");
    expect(courses.length).toBeGreaterThan(0);
    expect(courses.every((course) => course.status === "published")).toBe(true);
    expect(courses.every((course) => course.provider_slug === "dr-joao-silva")).toBe(true);
    expect(courses.some((course) => course.id === "crs-seed-draft")).toBe(false);
    expect(courses.some((course) => course.title.toLowerCase().includes("rascunho"))).toBe(false);
  });

  it("strips unpublished courses and private Academy fields from the public provider payload", () => {
    const dirty = {
      ...asListItem({ status: "published" }),
      youtube_video_id: "dQw4w9WgXcQ",
      youtube_source_url: "https://youtu.be/dQw4w9WgXcQ",
      bunny_video_id: "bunny-secret",
      email: "aluno@agroconnect.ao",
      student_email: "aluno@agroconnect.ao",
      enrolled_at: "2026-01-01T00:00:00.000Z",
      last_lesson_id: "les-secret",
      owner_id: "secret-owner",
    } as CourseListItem;
    const publicCourses = toPublicProviderAcademyCourses([
      dirty,
      asListItem({ id: "crs-draft", status: "draft", title: "Rascunho" }),
      asListItem({ id: "crs-paused", status: "paused", title: "Pausado" }),
      asListItem({ id: "crs-archived", status: "archived", title: "Arquivado" }),
    ]);

    expect(publicCourses.map((course) => course.id)).toEqual(["crs-pub"]);
    expect(publicCourses[0]?.status).toBe("published");
    expect(collectForbiddenPublicCourseKeys(publicCourses)).toEqual([]);
    expect(JSON.stringify(publicCourses)).not.toMatch(/youtube/i);
    expect(JSON.stringify(publicCourses)).not.toMatch(/bunny/i);
    expect(JSON.stringify(publicCourses)).not.toContain("aluno@agroconnect.ao");
    expect(JSON.stringify(publicCourses)).not.toContain("les-secret");
  });

  it("exposes the provider page public action without drafts or private keys", async () => {
    const result = await listProviderPublishedCoursesAction("dr-joao-silva");
    expect(result.courses.every((course) => course.status === "published")).toBe(true);
    expect(result.courses.some((course) => course.id === "crs-seed-draft")).toBe(false);
    expect(collectForbiddenPublicCourseKeys(result)).toEqual([]);
    expect(INITIAL_COURSES.some((course) => course.id === "crs-seed-draft")).toBe(true);
  });

  it("wires /providers/[slug] to the published Academy course contract", () => {
    expect(existsSync("src/app/providers/[slug]/page.tsx")).toBe(true);
    const page = readFileSync("src/app/providers/[slug]/page.tsx", "utf8");
    expect(page).toContain("listProviderPublishedCoursesAction");
    expect(page).toContain("providerId: res.id");
    expect(page).toContain("ProviderAcademyCoursesSection");
    expect(page).not.toContain("listOwnedCourseStudentsAction");
    expect(page).not.toContain("bunny");
    expect(page).not.toContain("youtube_video_id");
  });

  it("matches published courses by provider id when slug is not on the course row", async () => {
    CourseService.resetMemoryStore();
    const created = await CourseService.createCourse("prof-owner-1", {
      title: "Curso do prestador real",
      shortDescription: "Publicado",
      providerId: "prov-real-1",
    });
    const published = await CourseService.updateCourse("prof-owner-1", {
      id: created.id,
      status: "published",
    });
    expect(published.success).toBe(true);

    const { courses } = await CourseService.listPublishedCoursesForProvider({
      id: "prov-real-1",
      slug: "prestador-real",
    });
    expect(courses.some((course) => course.id === created.id)).toBe(true);
    expect(courses.every((course) => course.status === "published")).toBe(true);

    const fromAction = await listProviderPublishedCoursesAction("prestador-real", {
      providerId: "prov-real-1",
    });
    expect(fromAction.courses.some((course) => course.id === created.id)).toBe(true);
    expect(collectForbiddenPublicCourseKeys(fromAction)).toEqual([]);
  });

  it("matches published courses by instructor when provider_id was never stored", async () => {
    const created = await CourseService.createCourse("prof-owner-orphan", {
      title: "Curso sem provider_id",
      shortDescription: "Publicado pelo dono",
    });
    const published = await CourseService.updateCourse("prof-owner-orphan", {
      id: created.id,
      status: "published",
    });
    expect(published.success).toBe(true);
    expect(created.provider_id).toBeNull();

    expect(
      publishedCourseBelongsToProvider(
        {
          status: "published",
          provider_id: created.provider_id ?? null,
          provider_slug: null,
          instructor_id: created.owner_id,
        },
        { id: "prov-orphan", profileId: "prof-owner-orphan", slug: "prestador-orfao" }
      )
    ).toBe(true);
  });
});
