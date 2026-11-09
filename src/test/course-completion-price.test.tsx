import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n/provider";
import { CourseEditor } from "@/components/academy/CourseEditor";
import type { CourseEditorTree } from "@/types/agriacademy";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const publishCourseAction = vi.fn();
const getCourseEditorAction = vi.fn();

vi.mock("@/lib/services/course-actions", () => ({
  getCourseEditorAction: (...args: unknown[]) => getCourseEditorAction(...args),
  publishCourseAction: (...args: unknown[]) => publishCourseAction(...args),
  pauseCourseAction: vi.fn(),
  resumeCourseAction: vi.fn(),
  archiveCourseAction: vi.fn(),
  deleteCourseAction: vi.fn(),
  updateCourseAction: vi.fn(),
  createSectionAction: vi.fn(),
  createLessonAction: vi.fn(),
  deleteSectionAction: vi.fn(),
  deleteLessonAction: vi.fn(),
  updateSectionAction: vi.fn(),
  updateLessonAction: vi.fn(),
  assignLessonYouTubeAction: vi.fn(),
  reorderSectionsAction: vi.fn(),
  reorderLessonsAction: vi.fn(),
}));

function readyCourse(): CourseEditorTree {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    owner_id: "prof-1",
    title: "Gestão de milho",
    slug: "gestao-de-milho",
    description: "Formação completa",
    level: "beginner",
    price: 0,
    currency: "AOA",
    price_confirmed: false,
    status: "draft",
    lessons_count: 1,
    students_count: 0,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sections: [
      {
        id: "sec-1",
        course_id: "33333333-3333-4333-8333-333333333333",
        title: "Capítulo",
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lessons: [
          {
            id: "les-1",
            course_id: "33333333-3333-4333-8333-333333333333",
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
  };
}

describe("course creator price before completion", () => {
  beforeEach(() => {
    cleanup();
    publishCourseAction.mockReset();
    getCourseEditorAction.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          message: "Concluído",
          course: {
            id: readyCourse().id,
            title: "Gestão de milho",
            instructorName: "Mateus Junior",
            price: 0,
            currency: "AOA",
            courseUrl: "https://www.agroconnect.ao/agriacademy/courses/gestao-de-milho",
          },
          connection: { status: "not_connected", phone: null },
          groups: [],
        }),
      }))
    );
  });

  it("requires a valid price and then publishes that amount", async () => {
    getCourseEditorAction.mockResolvedValue(readyCourse());
    publishCourseAction.mockResolvedValue({ success: true, data: { status: "published" } });
    render(
      <I18nProvider initialLocale="pt">
        <CourseEditor courseId={readyCourse().id} />
      </I18nProvider>
    );

    const input = await screen.findByLabelText("Preço do curso (Kz)");
    const publish = screen.getByRole("button", { name: "Publicar" });
    expect(publish).toBeDisabled();
    fireEvent.change(input, { target: { value: "-5" } });
    expect(screen.getByText("Introduza um valor igual ou superior a zero.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publicar" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "0" } });
    const enabled = screen.getAllByRole("button", { name: "Publicar" });
    expect(enabled.some((button) => !button.hasAttribute("disabled"))).toBe(true);
    fireEvent.click(enabled.find((button) => !button.hasAttribute("disabled")) || enabled[0]);
    expect(publishCourseAction).toHaveBeenCalledWith(readyCourse().id, 0);
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });
});
