import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/i18n/provider";
import { CourseEditor } from "@/components/academy/CourseEditor";
import type { CourseEditorTree } from "@/types/agriacademy";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

const tree: CourseEditorTree = {
  id: "crs-ui",
  owner_id: "prof-seed-1",
  title: "Curso UI",
  slug: "curso-ui",
  description: "Descrição",
  short_description: "Curta",
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
          academy_video_id: "vid-1",
          is_free_preview: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    },
  ],
};

const getCourseEditorAction = vi.fn();
const pauseCourseAction = vi.fn();
const deleteCourseAction = vi.fn();

vi.mock("@/lib/services/course-actions", () => ({
  getCourseEditorAction: (...args: unknown[]) => getCourseEditorAction(...args),
  pauseCourseAction: (...args: unknown[]) => pauseCourseAction(...args),
  deleteCourseAction: (...args: unknown[]) => deleteCourseAction(...args),
  updateCourseAction: vi.fn(),
  publishCourseAction: vi.fn(),
  resumeCourseAction: vi.fn(),
  archiveCourseAction: vi.fn(),
  createSectionAction: vi.fn(),
  updateSectionAction: vi.fn(),
  deleteSectionAction: vi.fn(),
  createLessonAction: vi.fn(),
  updateLessonAction: vi.fn(),
  deleteLessonAction: vi.fn(),
  assignLessonVideoAction: vi.fn(),
}));

vi.mock("@/lib/services/academy-video-actions", () => ({
  getAcademyStorageAction: vi.fn().mockResolvedValue({
    usedBytes: 0,
    limitBytes: 1000,
    usedLabel: "0",
    limitLabel: "1",
    percent: 0,
  }),
}));

describe("CourseEditor deletion lifecycle", () => {
  beforeEach(() => {
    cleanup();
    push.mockReset();
    getCourseEditorAction.mockReset();
    pauseCourseAction.mockReset();
    deleteCourseAction.mockReset();
    getCourseEditorAction.mockResolvedValue({ ...tree, status: "published" });
    pauseCourseAction.mockResolvedValue({
      success: true,
      data: { ...tree, status: "paused" },
    });
    deleteCourseAction.mockResolvedValue({ success: true, data: { id: tree.id } });
  });

  it("blocks direct deletion of a published course and offers remove-from-publication", async () => {
    render(
      <I18nProvider initialLocale="pt">
        <CourseEditor courseId="crs-ui" />
      </I18nProvider>
    );

    await screen.findByDisplayValue("Curso UI");
    fireEvent.click(screen.getByRole("button", { name: /Eliminar curso/i }));
    expect(await screen.findByText("Curso publicado")).toBeInTheDocument();
    expect(
      screen.getByText(/não pode ser eliminado/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retirar da publicação/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    await waitFor(() => {
      expect(screen.queryByText("Curso publicado")).not.toBeInTheDocument();
    });
    expect(deleteCourseAction).not.toHaveBeenCalled();
    expect(pauseCourseAction).not.toHaveBeenCalled();
  });

  it("pauses a published course then asks for a second explicit delete confirmation", async () => {
    getCourseEditorAction
      .mockResolvedValueOnce({ ...tree, status: "published" })
      .mockResolvedValue({ ...tree, status: "paused" });

    render(
      <I18nProvider initialLocale="pt">
        <CourseEditor courseId="crs-ui" />
      </I18nProvider>
    );

    await screen.findByDisplayValue("Curso UI");
    fireEvent.click(screen.getByRole("button", { name: /Eliminar curso/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Retirar da publicação/i }));

    expect(await screen.findByText("Curso retirado da publicação")).toBeInTheDocument();
    expect(pauseCourseAction).toHaveBeenCalledWith("crs-ui");
    expect(deleteCourseAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Eliminar permanentemente/i }));
    await waitFor(() => {
      expect(deleteCourseAction).toHaveBeenCalledWith("crs-ui");
      expect(push).toHaveBeenCalledWith("/dashboard/academy?courseDeleted=1");
    });
  });

  it("leaves a paused course intact when the second confirmation is cancelled", async () => {
    getCourseEditorAction.mockResolvedValue({ ...tree, status: "paused" });

    render(
      <I18nProvider initialLocale="pt">
        <CourseEditor courseId="crs-ui" />
      </I18nProvider>
    );

    await screen.findByDisplayValue("Curso UI");
    fireEvent.click(screen.getByRole("button", { name: /Eliminar curso/i }));
    expect(await screen.findByText("Eliminar curso?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    await waitFor(() => {
      expect(screen.queryByText("Eliminar curso?")).not.toBeInTheDocument();
    });
    expect(deleteCourseAction).not.toHaveBeenCalled();
  });
});
