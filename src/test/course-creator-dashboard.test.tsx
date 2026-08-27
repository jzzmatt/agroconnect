import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n/provider";
import CourseCreatorPage from "@/app/(dashboard)/dashboard/academy/page";
import { CourseCard } from "@/components/ui/CourseCard";
import { deriveDashboardAuthoringProgress } from "@/lib/academy/authoring-progress";
import type { CourseListItem, CourseWithSections } from "@/types/agriacademy";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/subscription/use-authoritative-plan", () => ({
  useAuthoritativePlan: () => ({ plan: "professional", loading: false }),
}));

const getCourseCreatorDashboardAction = vi.fn();
const createCourseAction = vi.fn();

vi.mock("@/lib/services/course-actions", () => ({
  getCourseCreatorDashboardAction: (...args: unknown[]) => getCourseCreatorDashboardAction(...args),
  createCourseAction: (...args: unknown[]) => createCourseAction(...args),
  listOwnedCourseStudentsAction: vi.fn(),
}));

function listItem(overrides: Partial<CourseListItem> = {}): CourseListItem {
  return {
    id: "crs-ui",
    title: "Curso UI",
    slug: "curso-ui",
    instructor_id: "prof-seed-1",
    instructor_name: "Instrutor",
    description: "Descrição",
    short_description: "Curta",
    level: "beginner",
    price: 0,
    currency: "AOA",
    status: "draft",
    lessons_count: 0,
    students_count: 0,
    is_featured: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function treeWithoutChapters(): CourseWithSections {
  return {
    id: "crs-ui",
    owner_id: "prof-seed-1",
    title: "Curso UI",
    slug: "curso-ui",
    description: "Descrição",
    level: "beginner",
    price: 0,
    currency: "AOA",
    status: "draft",
    lessons_count: 0,
    students_count: 0,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sections: [],
  };
}

describe("Course Creator dashboard guided progress", () => {
  beforeEach(() => {
    cleanup();
    getCourseCreatorDashboardAction.mockReset();
    createCourseAction.mockReset();
  });

  it("prompts the instructor to create the first course when none exist", async () => {
    getCourseCreatorDashboardAction.mockResolvedValue({
      draftCourses: [],
      pausedCourses: [],
      publishedCourses: [],
      archivedCourses: [],
      attentionCourses: [],
    });

    render(
      <I18nProvider initialLocale="pt">
        <CourseCreatorPage />
      </I18nProvider>
    );

    expect(await screen.findByText(/Comece por criar o primeiro curso/)).toBeInTheDocument();
  });

  it("shows persisted next-step progress on a draft course card", async () => {
    const progress = deriveDashboardAuthoringProgress(treeWithoutChapters());
    getCourseCreatorDashboardAction.mockResolvedValue({
      draftCourses: [{ ...listItem(), progress }],
      pausedCourses: [],
      publishedCourses: [],
      archivedCourses: [],
      attentionCourses: [{ ...listItem(), progress }],
    });

    render(
      <I18nProvider initialLocale="pt">
        <CourseCreatorPage />
      </I18nProvider>
    );

    expect(await screen.findByText("Curso UI")).toBeInTheDocument();
    expect(screen.getByText(/Crie o primeiro capítulo/)).toBeInTheDocument();
    expect(screen.getByText("Informação do curso")).toBeInTheDocument();
    expect(screen.getByText("Capítulos")).toBeInTheDocument();
  });

  it("shows student count and View Students on published course cards", async () => {
    getCourseCreatorDashboardAction.mockResolvedValue({
      draftCourses: [],
      pausedCourses: [],
      publishedCourses: [
        {
          ...listItem({ status: "published", title: "Curso publicado" }),
          studentCount: 3,
        },
      ],
      archivedCourses: [],
      attentionCourses: [],
    });

    render(
      <I18nProvider initialLocale="pt">
        <CourseCreatorPage />
      </I18nProvider>
    );

    expect(await screen.findByText("Curso publicado")).toBeInTheDocument();
    expect(screen.getByText("3 estudantes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ver estudantes/i })).toBeInTheDocument();
  });

  it("shows paused, archived and attention buckets separately", async () => {
    const progress = deriveDashboardAuthoringProgress(treeWithoutChapters());
    getCourseCreatorDashboardAction.mockResolvedValue({
      draftCourses: [],
      pausedCourses: [
        {
          ...listItem({ id: "crs-paused", title: "Curso em pausa", status: "paused" }),
          progress,
          studentCount: 2,
        },
      ],
      publishedCourses: [],
      archivedCourses: [listItem({ id: "crs-arch", title: "Curso arquivado", status: "archived" })],
      attentionCourses: [
        {
          ...listItem({ id: "crs-paused", title: "Curso em pausa", status: "paused" }),
          progress,
        },
      ],
    });

    render(
      <I18nProvider initialLocale="pt">
        <CourseCreatorPage />
      </I18nProvider>
    );

    expect(await screen.findByText("Cursos que requerem atenção")).toBeInTheDocument();
    expect(screen.getAllByText("Curso em pausa").length).toBeGreaterThan(0);
    expect(screen.getByText("Cursos em pausa")).toBeInTheDocument();
    expect(screen.getByText("Cursos arquivados")).toBeInTheDocument();
    expect(screen.getByText("Curso arquivado")).toBeInTheDocument();
    expect(screen.getByText("2 estudantes")).toBeInTheDocument();
  });
});

describe("Public course card enrollment state", () => {
  it("shows Inscrever-se when the learner is not enrolled", () => {
    render(
      <I18nProvider initialLocale="pt">
        <CourseCard
          id="crs-1"
          slug="curso"
          title="Produção de milho"
          instructorName="Ana"
          durationHours={4}
          lessonsCount={6}
          ctaLabel="Inscrever-se"
          ctaHref="/agriacademy/courses/curso"
        />
      </I18nProvider>
    );

    expect(screen.getByRole("link", { name: /Inscrever-se/i })).toBeInTheDocument();
    expect(screen.queryByText(/Inscrito/)).not.toBeInTheDocument();
  });

  it("shows enrolled badge and continue CTA from database enrollment state", () => {
    render(
      <I18nProvider initialLocale="pt">
        <CourseCard
          id="crs-1"
          slug="curso"
          title="Produção de milho"
          instructorName="Ana"
          durationHours={4}
          lessonsCount={6}
          enrolled
          enrolledLabel="Inscrito"
          ctaLabel="Continuar curso"
          ctaHref="/agriacademy/courses/curso/learn"
        />
      </I18nProvider>
    );

    expect(screen.getByText(/Inscrito/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continuar curso/i })).toBeInTheDocument();
  });
});
