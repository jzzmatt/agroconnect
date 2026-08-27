import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/i18n/provider";
import { CourseEditor } from "@/components/academy/CourseEditor";
import type { CourseEditorTree } from "@/types/agriacademy";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function draftTree(overrides: Partial<CourseEditorTree> = {}): CourseEditorTree {
  return {
    id: "crs-ui",
    owner_id: "prof-seed-1",
    title: "Curso UI",
    slug: "curso-ui",
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
    updated_at: new Date().toISOString(),
    sections: [],
    ...overrides,
  };
}

const getCourseEditorAction = vi.fn();
const createSectionAction = vi.fn();
const createLessonAction = vi.fn();
const assignLessonYouTubeAction = vi.fn();
const publishCourseAction = vi.fn();
const reorderSectionsAction = vi.fn();
const reorderLessonsAction = vi.fn();

vi.mock("@/lib/services/course-actions", () => ({
  getCourseEditorAction: (...args: unknown[]) => getCourseEditorAction(...args),
  createSectionAction: (...args: unknown[]) => createSectionAction(...args),
  createLessonAction: (...args: unknown[]) => createLessonAction(...args),
  assignLessonYouTubeAction: (...args: unknown[]) => assignLessonYouTubeAction(...args),
  publishCourseAction: (...args: unknown[]) => publishCourseAction(...args),
  pauseCourseAction: vi.fn(),
  deleteCourseAction: vi.fn(),
  updateCourseAction: vi.fn(),
  resumeCourseAction: vi.fn(),
  archiveCourseAction: vi.fn(),
  updateSectionAction: vi.fn(),
  deleteSectionAction: vi.fn(),
  updateLessonAction: vi.fn(),
  deleteLessonAction: vi.fn(),
  reorderSectionsAction: (...args: unknown[]) => reorderSectionsAction(...args),
  reorderLessonsAction: (...args: unknown[]) => reorderLessonsAction(...args),
}));

describe("CourseEditor guided YouTube authoring", () => {
  beforeEach(() => {
    cleanup();
    getCourseEditorAction.mockReset();
    createSectionAction.mockReset();
    createLessonAction.mockReset();
    assignLessonYouTubeAction.mockReset();
    publishCourseAction.mockReset();
    reorderSectionsAction.mockReset();
    reorderLessonsAction.mockReset();
  });

  it("guides the instructor to create the first chapter", async () => {
    getCourseEditorAction.mockResolvedValue(draftTree());

    render(
      <I18nProvider initialLocale="pt">
        <CourseEditor courseId="crs-ui" />
      </I18nProvider>
    );

    await screen.findByDisplayValue("Curso UI");
    expect(screen.getByText("Fluxo de criação")).toBeInTheDocument();
    expect(screen.getByText(/Crie o primeiro capítulo/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Publicar$/i })).toBeDisabled();
  });

  it("identifies a lesson that still needs a YouTube video", async () => {
    getCourseEditorAction.mockResolvedValue(
      draftTree({
        sections: [
          {
            id: "sec-1",
            course_id: "crs-ui",
            title: "Capítulo A",
            sort_order: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            lessons: [
              {
                id: "les-1",
                course_id: "crs-ui",
                section_id: "sec-1",
                title: "Aula A",
                sort_order: 1,
                youtube_video_id: null,
                is_free_preview: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          },
        ],
      })
    );

    render(
      <I18nProvider initialLocale="pt">
        <CourseEditor courseId="crs-ui" />
      </I18nProvider>
    );

    await screen.findByDisplayValue("Curso UI");
    expect(screen.getByText(/Adicione um vídeo do YouTube à aula 01.01/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /A aula 01.01 \(Aula A\) precisa de um vídeo do YouTube/i }));
    expect(await screen.findByText("Vídeo do YouTube")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Publicar$/i })).toBeDisabled();
  });

  it("persists chapter order through the reorder action and rejects an empty result", async () => {
    const twoChapters = draftTree({
      sections: [
        {
          id: "sec-1",
          course_id: "crs-ui",
          title: "Capítulo A",
          sort_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          lessons: [],
        },
        {
          id: "sec-2",
          course_id: "crs-ui",
          title: "Capítulo B",
          sort_order: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          lessons: [],
        },
      ],
    });
    getCourseEditorAction.mockResolvedValue(twoChapters);
    reorderSectionsAction.mockResolvedValue({
      success: true,
      data: [
        { id: "sec-2", sort_order: 1 },
        { id: "sec-1", sort_order: 2 },
      ],
    });

    render(
      <I18nProvider initialLocale="pt">
        <CourseEditor courseId="crs-ui" />
      </I18nProvider>
    );

    await screen.findByDisplayValue("Curso UI");
    expect(screen.getByRole("heading", { name: "Editor de curso" })).toBeInTheDocument();
    const moveDown = screen.getAllByRole("button", { name: "Mover capítulo para baixo" });
    const moveUp = screen.getAllByRole("button", { name: "Mover capítulo para cima" });
    expect(moveUp[0]).toBeDisabled();
    expect(moveDown[1]).toBeDisabled();
    fireEvent.click(moveDown[0]!);

    await waitFor(() => {
      expect(reorderSectionsAction).toHaveBeenCalledWith("crs-ui", ["sec-2", "sec-1"]);
    });
  });

  it("does not treat a failed reorder as success", async () => {
    getCourseEditorAction.mockResolvedValue(
      draftTree({
        sections: [
          {
            id: "sec-1",
            course_id: "crs-ui",
            title: "Capítulo A",
            sort_order: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            lessons: [
              {
                id: "les-1",
                course_id: "crs-ui",
                section_id: "sec-1",
                title: "Aula A",
                sort_order: 1,
                youtube_video_id: "dQw4w9WgXcQ",
                is_free_preview: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                id: "les-2",
                course_id: "crs-ui",
                section_id: "sec-1",
                title: "Aula B",
                sort_order: 2,
                youtube_video_id: "jNQXAC9IVRw",
                is_free_preview: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          },
        ],
      })
    );
    reorderLessonsAction.mockResolvedValue({ success: true, data: [] });

    render(
      <I18nProvider initialLocale="pt">
        <CourseEditor courseId="crs-ui" />
      </I18nProvider>
    );

    await screen.findByDisplayValue("Curso UI");
    fireEvent.click(screen.getAllByRole("button", { name: "Mover aula para baixo" })[0]!);

    await waitFor(() => {
      expect(reorderLessonsAction).toHaveBeenCalledWith("sec-1", ["les-2", "les-1"]);
    });
    expect(await screen.findByText("Não foi possível concluir a operação. Tente novamente.")).toBeInTheDocument();
  });
});
