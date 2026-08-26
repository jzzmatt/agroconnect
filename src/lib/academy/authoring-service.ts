import { getAcademyWritableClient } from "@/lib/academy/supabase-client";
import { nextSortOrder } from "@/lib/academy/lesson-numbering";
import type {
  CourseLessonRecord,
  CourseSectionRecord,
  CourseWithSections,
} from "@/types/agriacademy";
import type { AcademyVideoDescriptor } from "@/types/agriacademy";

const SECTIONS_TABLE = "course_sections";
const LESSONS_TABLE = "course_lessons";
const COURSES_TABLE = "courses";

const memorySections: CourseSectionRecord[] = [
  {
    id: "sec-seed-1",
    course_id: "crs-seed-draft",
    title: "Introdução",
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const memoryLessons: CourseLessonRecord[] = [
  {
    id: "les-seed-1",
    course_id: "crs-seed-draft",
    section_id: "sec-seed-1",
    title: "Boas-vindas ao curso",
    description: null,
    sort_order: 1,
    academy_video_id: null,
    duration_seconds: null,
    is_free_preview: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function hasLiveSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

async function assertCourseOwner(courseId: string, ownerId: string): Promise<boolean> {
  if (hasLiveSupabase()) {
    try {
      const supabase = await getAcademyWritableClient();
      const { data } = await (supabase.from(COURSES_TABLE) as any)
        .select("id")
        .eq("id", courseId)
        .eq("owner_id", ownerId)
        .maybeSingle();
      return Boolean(data?.id);
    } catch {
      return false;
    }
  }
  return courseId === "crs-seed-draft" || ownerId === "prof-seed-1";
}

export type LessonWithVideo = CourseLessonRecord & {
  video?: AcademyVideoDescriptor | null;
};

export type SectionWithLessons = CourseSectionRecord & {
  lessons: LessonWithVideo[];
};

export type CourseEditorTree = CourseWithSections & {
  sections: SectionWithLessons[];
};

export class AcademyAuthoringService {
  public static resetMemoryStore(): void {
    memorySections.length = 0;
    memoryLessons.length = 0;
    memorySections.push({
      id: "sec-seed-1",
      course_id: "crs-seed-draft",
      title: "Introdução",
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    memoryLessons.push({
      id: "les-seed-1",
      course_id: "crs-seed-draft",
      section_id: "sec-seed-1",
      title: "Boas-vindas ao curso",
      description: null,
      sort_order: 1,
      academy_video_id: null,
      duration_seconds: null,
      is_free_preview: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  public static async getCourseEditorTree(
    courseId: string,
    ownerId: string
  ): Promise<CourseEditorTree | null> {
    if (!(await assertCourseOwner(courseId, ownerId))) return null;

    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const { data: course } = await (supabase.from(COURSES_TABLE) as any)
          .select("*")
          .eq("id", courseId)
          .eq("owner_id", ownerId)
          .maybeSingle();
        if (!course) return null;

        const { data: sections } = await (supabase.from(SECTIONS_TABLE) as any)
          .select("*")
          .eq("course_id", courseId)
          .order("sort_order", { ascending: true });

        const { data: lessons } = await (supabase.from(LESSONS_TABLE) as any)
          .select("*")
          .eq("course_id", courseId)
          .order("sort_order", { ascending: true });

        const videoIds = [...new Set((lessons || []).map((l: CourseLessonRecord) => l.academy_video_id).filter(Boolean))];
        const videoMap = new Map<string, AcademyVideoDescriptor>();
        if (videoIds.length > 0) {
          const { data: videos } = await (supabase.from("academy_videos") as any)
            .select("*")
            .in("id", videoIds);
          for (const video of videos || []) {
            videoMap.set(video.id, video as AcademyVideoDescriptor);
          }
        }

        const lessonsBySection = new Map<string, LessonWithVideo[]>();
        for (const lesson of (lessons || []) as CourseLessonRecord[]) {
          const list = lessonsBySection.get(lesson.section_id) || [];
          list.push({
            ...lesson,
            video: lesson.academy_video_id ? videoMap.get(lesson.academy_video_id) ?? null : null,
          });
          lessonsBySection.set(lesson.section_id, list);
        }

        return {
          ...(course as CourseWithSections),
          sections: ((sections || []) as CourseSectionRecord[]).map((section) => ({
            ...section,
            lessons: lessonsBySection.get(section.id) || [],
          })),
        };
      } catch (err) {
        console.warn("[AcademyAuthoringService.getCourseEditorTree] fallback:", err);
      }
    }

    const sections = memorySections
      .filter((section) => section.course_id === courseId)
      .sort((a, b) => a.sort_order - b.sort_order);

    return {
      id: courseId,
      owner_id: ownerId,
      title: "Rascunho de curso",
      slug: "rascunho",
      level: "all_levels",
      price: 0,
      currency: "AOA",
      status: "draft",
      lessons_count: memoryLessons.filter((l) => l.course_id === courseId).length,
      students_count: 0,
      is_featured: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sections: sections.map((section) => ({
        ...section,
        lessons: memoryLessons
          .filter((lesson) => lesson.section_id === section.id)
          .sort((a, b) => a.sort_order - b.sort_order),
      })),
    };
  }

  public static async createSection(
    ownerId: string,
    courseId: string,
    title: string
  ): Promise<CourseSectionRecord | null> {
    if (!(await assertCourseOwner(courseId, ownerId))) return null;
    const now = new Date().toISOString();
    const existing = memorySections.filter((section) => section.course_id === courseId);
    const sort_order = nextSortOrder(existing);

    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const { data, error } = await (supabase.from(SECTIONS_TABLE) as any)
          .insert({ course_id: courseId, title, sort_order })
          .select()
          .single();
        if (!error && data) return data as CourseSectionRecord;
      } catch (err) {
        console.warn("[AcademyAuthoringService.createSection] memory fallback:", err);
      }
    }

    const section: CourseSectionRecord = {
      id: `sec-${Date.now()}`,
      course_id: courseId,
      title,
      sort_order,
      created_at: now,
      updated_at: now,
    };
    memorySections.push(section);
    return section;
  }

  public static async updateSection(
    ownerId: string,
    sectionId: string,
    title: string
  ): Promise<CourseSectionRecord | null> {
    const section = memorySections.find((item) => item.id === sectionId);
    if (section && !(await assertCourseOwner(section.course_id, ownerId))) return null;

    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const { data: current } = await (supabase.from(SECTIONS_TABLE) as any)
          .select("course_id")
          .eq("id", sectionId)
          .maybeSingle();
        if (!current || !(await assertCourseOwner(current.course_id, ownerId))) return null;

        const { data, error } = await (supabase.from(SECTIONS_TABLE) as any)
          .update({ title, updated_at: new Date().toISOString() })
          .eq("id", sectionId)
          .select()
          .single();
        if (!error && data) return data as CourseSectionRecord;
      } catch (err) {
        console.warn("[AcademyAuthoringService.updateSection] memory fallback:", err);
      }
    }

    const idx = memorySections.findIndex((item) => item.id === sectionId);
    if (idx < 0) return null;
    memorySections[idx] = { ...memorySections[idx], title, updated_at: new Date().toISOString() };
    return memorySections[idx];
  }

  public static async deleteSection(ownerId: string, sectionId: string): Promise<boolean> {
    const section = memorySections.find((item) => item.id === sectionId);
    if (section && !(await assertCourseOwner(section.course_id, ownerId))) return false;

    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const { data: current } = await (supabase.from(SECTIONS_TABLE) as any)
          .select("course_id")
          .eq("id", sectionId)
          .maybeSingle();
        if (!current || !(await assertCourseOwner(current.course_id, ownerId))) return false;
        const { error } = await (supabase.from(SECTIONS_TABLE) as any).delete().eq("id", sectionId);
        if (!error) return true;
      } catch (err) {
        console.warn("[AcademyAuthoringService.deleteSection] memory fallback:", err);
      }
    }

    const lessonIds = memoryLessons.filter((lesson) => lesson.section_id === sectionId).map((l) => l.id);
    for (const lessonId of lessonIds) {
      await this.deleteLesson(ownerId, lessonId);
    }
    const idx = memorySections.findIndex((item) => item.id === sectionId);
    if (idx < 0) return false;
    memorySections.splice(idx, 1);
    return true;
  }

  public static async reorderSections(
    ownerId: string,
    courseId: string,
    orderedSectionIds: string[]
  ): Promise<CourseSectionRecord[]> {
    if (!(await assertCourseOwner(courseId, ownerId))) return [];

    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const updates = orderedSectionIds.map((id, index) =>
          (supabase.from(SECTIONS_TABLE) as any)
            .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("course_id", courseId)
        );
        await Promise.all(updates);
        const { data } = await (supabase.from(SECTIONS_TABLE) as any)
          .select("*")
          .eq("course_id", courseId)
          .order("sort_order", { ascending: true });
        if (data) return data as CourseSectionRecord[];
      } catch (err) {
        console.warn("[AcademyAuthoringService.reorderSections] memory fallback:", err);
      }
    }

    const courseSections = memorySections.filter((section) => section.course_id === courseId);
    const reordered = orderedSectionIds
      .map((id, index) => {
        const section = courseSections.find((item) => item.id === id);
        return section ? { ...section, sort_order: index + 1 } : null;
      })
      .filter((item): item is CourseSectionRecord => item !== null);
    for (const section of reordered) {
      const idx = memorySections.findIndex((item) => item.id === section.id);
      if (idx >= 0) memorySections[idx] = section;
    }
    return reordered;
  }

  public static async createLesson(
    ownerId: string,
    sectionId: string,
    title: string
  ): Promise<CourseLessonRecord | null> {
    const section = memorySections.find((item) => item.id === sectionId);
    const courseId =
      section?.course_id ||
      (hasLiveSupabase()
        ? (
            await ((await getAcademyWritableClient()).from(SECTIONS_TABLE) as any)
              .select("course_id")
              .eq("id", sectionId)
              .maybeSingle()
          ).data?.course_id
        : null);

    if (!courseId || !(await assertCourseOwner(courseId, ownerId))) return null;

    const now = new Date().toISOString();
    const existing = memoryLessons.filter((lesson) => lesson.section_id === sectionId);
    const sort_order = nextSortOrder(existing);

    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const { data, error } = await (supabase.from(LESSONS_TABLE) as any)
          .insert({ course_id: courseId, section_id: sectionId, title, sort_order })
          .select()
          .single();
        if (!error && data) return data as CourseLessonRecord;
      } catch (err) {
        console.warn("[AcademyAuthoringService.createLesson] memory fallback:", err);
      }
    }

    const lesson: CourseLessonRecord = {
      id: `les-${Date.now()}`,
      course_id: courseId,
      section_id: sectionId,
      title,
      description: null,
      sort_order,
      academy_video_id: null,
      duration_seconds: null,
      is_free_preview: false,
      created_at: now,
      updated_at: now,
    };
    memoryLessons.push(lesson);
    return lesson;
  }

  public static async updateLesson(
    ownerId: string,
    lessonId: string,
    patch: Partial<Pick<CourseLessonRecord, "title" | "description" | "is_free_preview">>
  ): Promise<CourseLessonRecord | null> {
    const lesson = memoryLessons.find((item) => item.id === lessonId);
    if (lesson && !(await assertCourseOwner(lesson.course_id, ownerId))) return null;

    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const { data: current } = await (supabase.from(LESSONS_TABLE) as any)
          .select("course_id")
          .eq("id", lessonId)
          .maybeSingle();
        if (!current || !(await assertCourseOwner(current.course_id, ownerId))) return null;

        const { data, error } = await (supabase.from(LESSONS_TABLE) as any)
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("id", lessonId)
          .select()
          .single();
        if (!error && data) return data as CourseLessonRecord;
      } catch (err) {
        console.warn("[AcademyAuthoringService.updateLesson] memory fallback:", err);
      }
    }

    const idx = memoryLessons.findIndex((item) => item.id === lessonId);
    if (idx < 0) return null;
    memoryLessons[idx] = { ...memoryLessons[idx], ...patch, updated_at: new Date().toISOString() };
    return memoryLessons[idx];
  }

  public static async assignLessonVideo(
    ownerId: string,
    lessonId: string,
    videoId: string | null
  ): Promise<CourseLessonRecord | null> {
    const lesson = memoryLessons.find((item) => item.id === lessonId);
    if (lesson && !(await assertCourseOwner(lesson.course_id, ownerId))) return null;

    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const { data: current } = await (supabase.from(LESSONS_TABLE) as any)
          .select("course_id")
          .eq("id", lessonId)
          .maybeSingle();
        if (!current || !(await assertCourseOwner(current.course_id, ownerId))) return null;

        if (videoId) {
          const { data: video } = await (supabase.from("academy_videos") as any)
            .select("id")
            .eq("id", videoId)
            .eq("owner_id", ownerId)
            .maybeSingle();
          if (!video) return null;
        }

        const { data, error } = await (supabase.from(LESSONS_TABLE) as any)
          .update({
            academy_video_id: videoId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lessonId)
          .select()
          .single();
        if (!error && data) return data as CourseLessonRecord;
      } catch (err) {
        console.warn("[AcademyAuthoringService.assignLessonVideo] memory fallback:", err);
      }
    }

    const idx = memoryLessons.findIndex((item) => item.id === lessonId);
    if (idx < 0) return null;
    memoryLessons[idx] = {
      ...memoryLessons[idx],
      academy_video_id: videoId,
      updated_at: new Date().toISOString(),
    };
    return memoryLessons[idx];
  }

  public static async deleteLesson(ownerId: string, lessonId: string): Promise<boolean> {
    const lesson = memoryLessons.find((item) => item.id === lessonId);
    if (lesson && !(await assertCourseOwner(lesson.course_id, ownerId))) return false;

    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const { data: current } = await (supabase.from(LESSONS_TABLE) as any)
          .select("course_id")
          .eq("id", lessonId)
          .maybeSingle();
        if (!current || !(await assertCourseOwner(current.course_id, ownerId))) return false;
        const { error } = await (supabase.from(LESSONS_TABLE) as any).delete().eq("id", lessonId);
        if (!error) return true;
      } catch (err) {
        console.warn("[AcademyAuthoringService.deleteLesson] memory fallback:", err);
      }
    }

    const idx = memoryLessons.findIndex((item) => item.id === lessonId);
    if (idx < 0) return false;
    memoryLessons.splice(idx, 1);
    return true;
  }

  public static async reorderLessons(
    ownerId: string,
    sectionId: string,
    orderedLessonIds: string[]
  ): Promise<CourseLessonRecord[]> {
    const section = memorySections.find((item) => item.id === sectionId);
    if (section && !(await assertCourseOwner(section.course_id, ownerId))) return [];

    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const { data: current } = await (supabase.from(SECTIONS_TABLE) as any)
          .select("course_id")
          .eq("id", sectionId)
          .maybeSingle();
        if (!current || !(await assertCourseOwner(current.course_id, ownerId))) return [];

        const updates = orderedLessonIds.map((id, index) =>
          (supabase.from(LESSONS_TABLE) as any)
            .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("section_id", sectionId)
        );
        await Promise.all(updates);
        const { data } = await (supabase.from(LESSONS_TABLE) as any)
          .select("*")
          .eq("section_id", sectionId)
          .order("sort_order", { ascending: true });
        if (data) return data as CourseLessonRecord[];
      } catch (err) {
        console.warn("[AcademyAuthoringService.reorderLessons] memory fallback:", err);
      }
    }

    const sectionLessons = memoryLessons.filter((lesson) => lesson.section_id === sectionId);
    const reordered = orderedLessonIds
      .map((id, index) => {
        const lesson = sectionLessons.find((item) => item.id === id);
        return lesson ? { ...lesson, sort_order: index + 1 } : null;
      })
      .filter((item): item is CourseLessonRecord => item !== null);
    for (const lesson of reordered) {
      const idx = memoryLessons.findIndex((item) => item.id === lesson.id);
      if (idx >= 0) memoryLessons[idx] = lesson;
    }
    return reordered;
  }

  public static countVideoReferences(videoId: string): number {
    return memoryLessons.filter((lesson) => lesson.academy_video_id === videoId).length;
  }
}
