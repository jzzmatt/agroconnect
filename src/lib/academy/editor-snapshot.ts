type EditorSnapshotLesson = {
  id: string;
  title: string;
  sort_order: number;
  academy_video_id?: string | null;
};

type EditorSnapshotSection = {
  id: string;
  title: string;
  sort_order: number;
  lessons?: EditorSnapshotLesson[];
};

type EditorSnapshotCourse = {
  title: string;
  description?: string | null;
  short_description?: string | null;
  status: string;
  sections?: EditorSnapshotSection[];
};

/** Persisted editor snapshot used to detect unsaved course content changes. */
export function courseEditorFingerprint(course: EditorSnapshotCourse): string {
  return JSON.stringify({
    title: course.title,
    description: course.description ?? "",
    short_description: course.short_description ?? "",
    status: course.status,
    sections: (course.sections || []).map((section) => ({
      id: section.id,
      title: section.title,
      sort_order: section.sort_order,
      lessons: (section.lessons || []).map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        sort_order: lesson.sort_order,
        academy_video_id: lesson.academy_video_id ?? null,
      })),
    })),
  });
}
