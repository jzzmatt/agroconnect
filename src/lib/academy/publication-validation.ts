import type { CourseWithSections } from "@/types/agriacademy";
import { isYouTubeVideoId } from "@/lib/academy/youtube";

export interface PublicationValidationResult {
  ok: boolean;
  errors: string[];
}

type LessonWithYouTube = {
  youtube_video_id?: string | null;
};

export function validateCourseForPublication(
  course: CourseWithSections & {
    sections: Array<{ lessons?: LessonWithYouTube[] }>;
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

  const lessons = course.sections.flatMap((section) => section.lessons || []) as LessonWithYouTube[];
  if (lessons.length === 0) {
    errors.push("O curso precisa de pelo menos uma aula.");
  }

  const lessonsWithoutVideo = lessons.filter((lesson) => !isYouTubeVideoId(lesson.youtube_video_id));
  if (lessonsWithoutVideo.length > 0) {
    errors.push("Todas as aulas precisam de um vídeo do YouTube associado antes da publicação.");
  }

  return { ok: errors.length === 0, errors };
}
