import type { CourseWithSections } from "@/types/agriacademy";
import type { AcademyVideoDescriptor } from "@/types/agriacademy";

export interface PublicationValidationResult {
  ok: boolean;
  errors: string[];
}

type LessonWithVideo = {
  academy_video_id?: string | null;
  video?: Pick<AcademyVideoDescriptor, "status"> | null;
};

export function validateCourseForPublication(
  course: CourseWithSections & {
    sections: Array<{ lessons?: LessonWithVideo[] }>;
  }
): PublicationValidationResult {
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

  const lessons = course.sections.flatMap((section) => section.lessons || []) as LessonWithVideo[];
  if (lessons.length === 0) {
    errors.push("O curso precisa de pelo menos uma aula.");
  }

  const lessonsWithoutVideo = lessons.filter((lesson) => !lesson.academy_video_id);
  if (lessonsWithoutVideo.length > 0) {
    errors.push("Todas as aulas precisam de um vídeo associado antes da publicação.");
  }

  const lessonsWithUnreadyVideo = lessons.filter(
    (lesson) =>
      lesson.academy_video_id &&
      lesson.video?.status &&
      lesson.video.status !== "ready"
  );
  if (lessonsWithUnreadyVideo.length > 0) {
    errors.push("Todos os vídeos das aulas devem estar processados (estado: pronto) antes da publicação.");
  }

  return { ok: errors.length === 0, errors };
}
