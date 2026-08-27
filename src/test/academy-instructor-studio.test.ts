import { describe, it, expect } from "vitest";
import { requireOwnedCourseId } from "@/lib/academy/instructor-access";
import { deriveCoursesRequiringAttention } from "@/lib/academy/course-attention";
import { deriveReadinessChecklist } from "@/lib/academy/course-readiness";
import { validateCourseForPublication } from "@/lib/academy/publication-validation";
import { deriveDashboardAuthoringProgress } from "@/lib/academy/authoring-progress";
import type { AuthoringProgress } from "@/lib/academy/authoring-progress";
import type { CourseWithSections } from "@/types/agriacademy";

function course(overrides: Partial<CourseWithSections> = {}): CourseWithSections {
  return {
    id: "crs-9",
    owner_id: "owner-1",
    title: "Curso completo",
    slug: "curso-completo",
    description: "Descrição",
    level: "beginner",
    price: 0,
    currency: "AOA",
    status: "draft",
    lessons_count: 1,
    students_count: 0,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sections: [
      {
        id: "sec-1",
        course_id: "crs-9",
        title: "Capítulo",
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lessons: [
          {
            id: "les-1",
            course_id: "crs-9",
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
    ...overrides,
  };
}

describe("AGROCONNECT Phase 9 — Instructor studio", () => {
  it("rejects student-list access for a course the instructor does not own", () => {
    expect(() => requireOwnedCourseId(["crs-own"], "crs-other")).toThrow("Acesso negado.");
    expect(() => requireOwnedCourseId(["crs-own"], "crs-own")).not.toThrow();
    expect(() => requireOwnedCourseId([], "crs-own")).toThrow("Acesso negado.");
  });

  it("blocks publication when a chapter has no lessons", () => {
    const incomplete = course({
      sections: [
        {
          id: "sec-empty",
          course_id: "crs-9",
          title: "Vazio",
          sort_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          lessons: [],
        },
        course().sections[0],
      ],
    });
    const result = validateCourseForPublication(incomplete);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "MISSING_STRUCTURE")).toBe(true);
  });

  it("builds the five-item readiness checklist including course structure", () => {
    const ready = deriveReadinessChecklist(course());
    expect(ready.items.map((item) => item.id)).toEqual([
      "course_info",
      "chapters",
      "lessons",
      "youtube",
      "structure",
    ]);
    expect(ready.items.every((item) => item.complete)).toBe(true);
    expect(ready.ready).toBe(true);

    const incomplete = deriveReadinessChecklist(course({ sections: [] }));
    expect(incomplete.items.find((item) => item.id === "structure")?.complete).toBe(false);
    expect(incomplete.ready).toBe(false);

    const emptyChapter = deriveReadinessChecklist(
      course({
        sections: [
          {
            ...course().sections[0],
            id: "sec-empty",
            lessons: [],
          },
          course().sections[0],
        ],
      })
    );
    expect(emptyChapter.items.find((item) => item.id === "structure")?.complete).toBe(false);
    expect(emptyChapter.ready).toBe(false);
  });

  it("lists draft and paused incomplete courses as requiring attention", () => {
    const progress: AuthoringProgress = deriveDashboardAuthoringProgress(course({ sections: [] }));
    const readyProgress: AuthoringProgress = deriveDashboardAuthoringProgress(course({ status: "paused" }));
    const attention = deriveCoursesRequiringAttention([
      { id: "draft-bad", status: "draft", progress },
      { id: "paused-bad", status: "paused", progress },
      { id: "paused-ready", status: "paused", progress: readyProgress },
      { id: "published", status: "published", progress },
    ]);
    expect(attention.map((item) => item.id)).toEqual(["draft-bad", "paused-bad"]);
  });
});
