import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/i18n/provider";
import { CourseDetailClient } from "@/components/academy/CourseDetailClient";
import { CourseLearnClient } from "@/components/academy/CourseLearnClient";
import { EnrolledCourseCard } from "@/components/academy/EnrolledCourseCard";
import { YouTubePlayer } from "@/components/academy/YouTubePlayer";
import type { CourseWithSections, EnrolledCourseListItem } from "@/types/agriacademy";

const push = vi.fn();
const replace = vi.fn();
const isSignedIn = { current: false };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: isSignedIn.current }),
}));

const getPublishedCourseDetailAction = vi.fn();
const getCourseEnrollmentStatusAction = vi.fn();
const getCourseLearnContextAction = vi.fn();
const recordLessonProgressAction = vi.fn();

vi.mock("@/lib/services/course-actions", () => ({
  getPublishedCourseDetailAction: (...args: unknown[]) => getPublishedCourseDetailAction(...args),
  getCourseEnrollmentStatusAction: (...args: unknown[]) => getCourseEnrollmentStatusAction(...args),
  getCourseLearnContextAction: (...args: unknown[]) => getCourseLearnContextAction(...args),
  recordLessonProgressAction: (...args: unknown[]) => recordLessonProgressAction(...args),
}));

function publishedTree(): CourseWithSections {
  return {
    id: "crs-ui",
    owner_id: "instructor-1",
    title: "Produção de Milho",
    slug: "producao-milho",
    description: "Descrição",
    short_description: "Curta",
    level: "beginner",
    price: 0,
    currency: "AOA",
    status: "published",
    lessons_count: 2,
    students_count: 0,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sections: [
      {
        id: "sec-1",
        course_id: "crs-ui",
        title: "Introdução",
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lessons: [
          {
            id: "les-1",
            course_id: "crs-ui",
            section_id: "sec-1",
            title: "Apresentação",
            sort_order: 1,
            youtube_video_id: null,
            is_free_preview: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "les-2",
            course_id: "crs-ui",
            section_id: "sec-1",
            title: "Plantação",
            sort_order: 2,
            youtube_video_id: null,
            is_free_preview: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      },
    ],
  };
}

function enrolledItem(status: EnrolledCourseListItem["course"]["status"] = "published"): EnrolledCourseListItem {
  const tree = publishedTree();
  return {
    enrollmentId: "enr-1",
    enrolledAt: new Date().toISOString(),
    lastLessonId: "les-2",
    course: {
      id: tree.id,
      title: tree.title,
      slug: tree.slug,
      instructor_id: tree.owner_id,
      instructor_name: "Instrutor",
      description: tree.description,
      level: tree.level,
      price: tree.price,
      currency: tree.currency,
      status,
      lessons_count: 2,
      students_count: 0,
      is_featured: false,
      created_at: tree.created_at,
    },
  };
}

describe("Phase 8 student learning UI", () => {
  beforeEach(() => {
    cleanup();
    push.mockReset();
    replace.mockReset();
    isSignedIn.current = false;
    getPublishedCourseDetailAction.mockReset();
    getCourseEnrollmentStatusAction.mockReset();
    getCourseLearnContextAction.mockReset();
    recordLessonProgressAction.mockReset();
    getPublishedCourseDetailAction.mockResolvedValue(publishedTree());
    getCourseEnrollmentStatusAction.mockResolvedValue({ enrolled: false, authenticated: false });
    recordLessonProgressAction.mockResolvedValue({ success: true, lastLessonId: "les-1" });
    vi.unstubAllGlobals();
  });

  it("sends anonymous Inscrever-se to Clerk sign-up with a return-to-course URL", async () => {
    render(
      <I18nProvider initialLocale="pt">
        <CourseDetailClient slug="producao-milho" />
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "Produção de Milho" });
    fireEvent.click(screen.getByRole("button", { name: /Inscrever-se/i }));
    expect(push).toHaveBeenCalledWith(
      `/sign-up?redirect_url=${encodeURIComponent("/agriacademy/courses/producao-milho?enroll=1")}`
    );
  });

  it("shows already-enrolled state from the database and Continuar curso", async () => {
    isSignedIn.current = true;
    getCourseEnrollmentStatusAction.mockResolvedValue({ enrolled: true, authenticated: true });

    render(
      <I18nProvider initialLocale="pt">
        <CourseDetailClient slug="producao-milho" />
      </I18nProvider>
    );

    expect(await screen.findByText("✓ Inscrito")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuar curso/i })).toBeInTheDocument();
  });

  it("enrolls an authenticated user and routes to the learning page", async () => {
    isSignedIn.current = true;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, enrollment: { id: "enr-1" }, alreadyEnrolled: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <I18nProvider initialLocale="pt">
        <CourseDetailClient slug="producao-milho" />
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "Produção de Milho" });
    fireEvent.click(screen.getByRole("button", { name: /Inscrever-se/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/academy/enroll",
        expect.objectContaining({ method: "POST" })
      );
    });
    await waitFor(
      () => {
        expect(push).toHaveBeenCalledWith("/agriacademy/courses/producao-milho/learn?enrolled=1");
      },
      { timeout: 2500 }
    );
    vi.unstubAllGlobals();
  });

  it("renders chapter/lesson navigation and the Unlisted YouTube notice", async () => {
    const tree = publishedTree();
    getCourseLearnContextAction.mockResolvedValue({
      allowed: true,
      course: tree,
      startLesson: tree.sections[0].lessons[0],
      enrolled: true,
    });

    render(
      <I18nProvider initialLocale="pt">
        <CourseLearnClient slug="producao-milho" />
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "Produção de Milho" });
    expect(screen.getAllByText("01 — Introdução").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /01.02 — Plantação/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Próxima aula/i })).toBeInTheDocument();
    expect(screen.getByText(/YouTube como Não listado/)).toBeInTheDocument();
    await waitFor(() => {
      expect(recordLessonProgressAction).toHaveBeenCalledWith("crs-ui", "les-1");
    });
  });

  it("explains paused-course behaviour to enrolled students", async () => {
    getCourseLearnContextAction.mockResolvedValue({
      allowed: false,
      reason: "course_unavailable",
      course: { ...publishedTree(), status: "paused" },
    });

    render(
      <I18nProvider initialLocale="pt">
        <CourseLearnClient slug="producao-milho" />
      </I18nProvider>
    );

    expect(await screen.findByText(/curso está em pausa/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Voltar aos meus cursos/i })).toBeInTheDocument();
  });

  it("disables continue on My Courses when the enrolled course is paused", () => {
    render(
      <I18nProvider initialLocale="pt">
        <EnrolledCourseCard item={enrolledItem("paused")} />
      </I18nProvider>
    );
    expect(screen.getByText(/curso está em pausa/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continuar curso/i })).not.toBeInTheDocument();
  });

  it("continues a published enrolled course from the last lesson", () => {
    render(
      <I18nProvider initialLocale="pt">
        <EnrolledCourseCard item={enrolledItem("published")} />
      </I18nProvider>
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/agriacademy/courses/producao-milho/learn?lesson=les-2"
    );
  });

  it("embeds the YouTube player with native controls", () => {
    render(
      <YouTubePlayer
        embedUrl="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
        title="Aula"
        ready
        pendingLabel="A carregar"
      />
    );
    const iframe = screen.getByTitle("Aula");
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe).toHaveAttribute("allowfullscreen");
  });
});
