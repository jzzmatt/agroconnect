import type { CourseWithSections } from "@/types/agriacademy";
import { formatLessonNumber } from "@/lib/academy/lesson-numbering";
import { isYouTubeVideoId } from "@/lib/academy/youtube";

export type PublicationIssueCode =
  | "MISSING_TITLE"
  | "MISSING_DESCRIPTION"
  | "MISSING_CHAPTER"
  | "MISSING_LESSON"
  | "MISSING_YOUTUBE";

export interface PublicationIssue {
  code: PublicationIssueCode;
  lessonId?: string;
  lessonNumber?: string;
  lessonTitle?: string;
}

export interface PublicationValidationResult {
  ok: boolean;
  errors: string[];
  issues: PublicationIssue[];
}

type LessonWithYouTube = {
  id?: string;
  title?: string | null;
  sort_order?: number;
  youtube_video_id?: string | null;
};

function fallbackMessage(issue: PublicationIssue): string {
  switch (issue.code) {
    case "MISSING_TITLE":
      return "O curso precisa de um título.";
    case "MISSING_DESCRIPTION":
      return "O curso precisa de uma descrição.";
    case "MISSING_CHAPTER":
      return "O curso precisa de pelo menos um capítulo.";
    case "MISSING_LESSON":
      return "O curso precisa de pelo menos uma aula.";
    case "MISSING_YOUTUBE": {
      const lesson = issue.lessonNumber
        ? issue.lessonTitle
          ? `${issue.lessonNumber} (${issue.lessonTitle})`
          : issue.lessonNumber
        : null;
      return lesson
        ? `A aula ${lesson} precisa de um vídeo do YouTube associado.`
        : "Todas as aulas precisam de um vídeo do YouTube associado antes da publicação.";
    }
  }
}

export function validateCourseForPublication(
  course: CourseWithSections & {
    sections: Array<{
      sort_order?: number;
      lessons?: LessonWithYouTube[];
    }>;
  }
): PublicationValidationResult {
  const issues: PublicationIssue[] = [];

  if (!course.title?.trim()) {
    issues.push({ code: "MISSING_TITLE" });
  }

  if (!course.description?.trim() && !course.short_description?.trim()) {
    issues.push({ code: "MISSING_DESCRIPTION" });
  }

  if (!course.sections || course.sections.length === 0) {
    issues.push({ code: "MISSING_CHAPTER" });
  }

  const numberedLessons = (course.sections || []).flatMap((section) =>
    (section.lessons || []).map((lesson) => ({
      lesson,
      lessonNumber: formatLessonNumber(section.sort_order ?? 1, lesson.sort_order ?? 1),
    }))
  );

  if (numberedLessons.length === 0) {
    issues.push({ code: "MISSING_LESSON" });
  }

  for (const { lesson, lessonNumber } of numberedLessons) {
    if (isYouTubeVideoId(lesson.youtube_video_id)) continue;
    issues.push({
      code: "MISSING_YOUTUBE",
      lessonId: lesson.id,
      lessonNumber,
      lessonTitle: lesson.title?.trim() || undefined,
    });
  }

  return {
    ok: issues.length === 0,
    issues,
    errors: issues.map(fallbackMessage),
  };
}
