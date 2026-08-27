import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n/provider";
import { ProviderAcademyCoursesSection } from "@/components/academy/ProviderAcademyCoursesSection";
import type { CourseListItem } from "@/types/agriacademy";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: false }),
}));

vi.mock("@/lib/services/course-actions", () => ({
  listMyEnrolledCourseIdsAction: vi.fn().mockResolvedValue([]),
}));

function publishedCourse(): CourseListItem {
  return {
    id: "crs-seed-1",
    title: "Maneio Intensivo e Nutrição de Gado Bovino em Angola",
    slug: "maneio-intensivo-nutricao-gado-bovino-angola",
    instructor_id: "prof-seed-1",
    instructor_name: "Dr. João Silva",
    instructor_role: "Médico Veterinário",
    provider_slug: "dr-joao-silva",
    description: "Formação pública",
    short_description: "Nutrição bovina",
    level: "intermediate",
    price: 45000,
    currency: "AOA",
    category: "Pecuária Bovina",
    duration_hours: 16,
    lessons_count: 22,
    students_count: 184,
    status: "published",
    is_featured: true,
    created_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  };
}

describe("Provider page Academy courses", () => {
  beforeEach(() => {
    cleanup();
  });

  it("links published courses into the public enrollment flow", () => {
    render(
      <I18nProvider initialLocale="pt">
        <ProviderAcademyCoursesSection courses={[publishedCourse()]} providerName="Dr. João Silva" />
      </I18nProvider>
    );

    expect(screen.getByText("Cursos AgriAcademy (1)")).toBeInTheDocument();
    expect(screen.getByText("Formações publicadas por Dr. João Silva")).toBeInTheDocument();
    expect(screen.getByText("Maneio Intensivo e Nutrição de Gado Bovino em Angola")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Inscrever-se/i })).toHaveAttribute(
      "href",
      "/agriacademy/courses/maneio-intensivo-nutricao-gado-bovino-angola"
    );
    expect(screen.queryByText("Ver estudantes")).not.toBeInTheDocument();
    expect(screen.queryByText(/aluno@/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/youtube/i)).not.toBeInTheDocument();
  });

  it("shows an empty state when the provider has no published courses", () => {
    render(
      <I18nProvider initialLocale="pt">
        <ProviderAcademyCoursesSection courses={[]} providerName="Dr. João Silva" />
      </I18nProvider>
    );

    expect(screen.getByText("Cursos AgriAcademy (0)")).toBeInTheDocument();
    expect(screen.getByText("Este prestador ainda não tem cursos publicados.")).toBeInTheDocument();
  });
});
