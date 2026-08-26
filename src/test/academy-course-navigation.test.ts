import { describe, it, expect } from "vitest";
import {
  buildCourseLearnPath,
  listOrderedLessons,
  resolveStartLesson,
} from "@/lib/academy/course-navigation";
import type { CourseWithSections } from "@/types/agriacademy";

function sampleCourse(): CourseWithSections {
  return {
    id: "crs-1",
    owner_id: "owner-1",
    title: "Produção de Milho",
    slug: "producao-milho",
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
        course_id: "crs-1",
        title: "Introdução",
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lessons: [
          {
            id: "les-1",
            course_id: "crs-1",
            section_id: "sec-1",
            title: "Apresentação",
            sort_order: 1,
            is_free_preview: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      },
      {
        id: "sec-2",
        course_id: "crs-1",
        title: "Plantação",
        sort_order: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lessons: [
          {
            id: "les-2",
            course_id: "crs-1",
            section_id: "sec-2",
            title: "Sementes",
            sort_order: 1,
            is_free_preview: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      },
    ],
  };
}

describe("course navigation", () => {
  it("builds the learning route with optional lesson id", () => {
    expect(buildCourseLearnPath("producao-milho")).toBe("/agriacademy/courses/producao-milho/learn");
    expect(buildCourseLearnPath("producao-milho", "les-2")).toBe(
      "/agriacademy/courses/producao-milho/learn?lesson=les-2"
    );
  });

  it("orders lessons across chapters", () => {
    const lessons = listOrderedLessons(sampleCourse());
    expect(lessons.map((lesson) => lesson.id)).toEqual(["les-1", "les-2"]);
  });

  it("starts on the first lesson when no progress exists", () => {
    const lesson = resolveStartLesson(sampleCourse());
    expect(lesson?.id).toBe("les-1");
  });

  it("opens a requested lesson when it exists", () => {
    const lesson = resolveStartLesson(sampleCourse(), { lessonId: "les-2" });
    expect(lesson?.id).toBe("les-2");
  });
});
