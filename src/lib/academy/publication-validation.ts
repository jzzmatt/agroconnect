import type { CourseWithSections } from "@/types/agriacademy";

export interface PublicationValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateCourseForPublication(course: CourseWithSections): PublicationValidationResult {
  const errors: string[] = [];

  if (!course.title?.trim()) {
    errors.push("O curso precisa de um título.");
  }

  if (!course.description?.trim() && !course.short_description?.trim()) {
    errors.push("O curso precisa de uma descrição.");
  }

  if (!course.sections || course.sections.length === 0) {
    errors.push("O curso precisa de pelo menos um capítulo.");
  }

  const lessons = course.sections.flatMap((section) => section.lessons || []);
  if (lessons.length === 0) {
    errors.push("O curso precisa de pelo menos uma aula.");
  }

  const lessonsWithoutVideo = lessons.filter((lesson) => !lesson.academy_video_id);
  if (lessonsWithoutVideo.length > 0) {
    errors.push("Todas as aulas precisam de um vídeo associado antes da publicação.");
  }

  return { ok: errors.length === 0, errors };
}
