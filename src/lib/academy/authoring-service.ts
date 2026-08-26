import "server-only";

import { getAcademyWritableClient } from "@/lib/academy/supabase-client";
import { nextSortOrder, reorderItems } from "@/lib/academy/lesson-numbering";
import {
  CoursePersistenceError,
  COURSE_MUTATION_MESSAGES,
} from "@/lib/academy/course-errors";
import { extractYouTubeVideoId } from "@/lib/academy/youtube";
import { isMissingYoutubeColumnError } from "@/lib/academy/db-errors";
import type {
  CourseEditorTree,
  CourseLessonRecord,
  CourseSectionRecord,
  CourseWithSections,
  LessonWithVideo,
  SectionWithLessons,
} from "@/types/agriacademy";

const SECTIONS_TABLE = "course_sections";
const LESSONS_TABLE = "course_lessons";
const COURSES_TABLE = "courses";
const SORT_ORDER_OFFSET = 1_000_000;

const memorySections: CourseSectionRecord[] = [];
const memoryLessons: CourseLessonRecord[] = [];

function hasLiveSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

function seedMemoryStore(): void {
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
    youtube_video_id: null,
    youtube_source_url: null,
    duration_seconds: null,
    is_free_preview: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

seedMemoryStore();

function databaseError(cause?: unknown): CoursePersistenceError {
  if (isMissingYoutubeColumnError(cause)) {
    return new CoursePersistenceError(
      "YOUTUBE_SCHEMA_MISSING",
      COURSE_MUTATION_MESSAGES.YOUTUBE_SCHEMA_MISSING,
      cause
    );
  }
  return new CoursePersistenceError("DATABASE_ERROR", COURSE_MUTATION_MESSAGES.DATABASE_ERROR, cause);
}

function normalizeSection(row: Record<string, unknown>): CourseSectionRecord {
  return {
    id: String(row.id),
    course_id: String(row.course_id),
    title: String(row.title),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeLesson(row: Record<string, unknown>): CourseLessonRecord {
  return {
    id: String(row.id),
    course_id: String(row.course_id),
    section_id: String(row.section_id),
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    sort_order: Number(row.sort_order ?? 0),
    academy_video_id: (row.academy_video_id as string | null) ?? null,
    youtube_video_id: (row.youtube_video_id as string | null) ?? null,
    youtube_source_url: (row.youtube_source_url as string | null) ?? null,
    duration_seconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
    is_free_preview: Boolean(row.is_free_preview),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

async function assertCourseOwner(courseId: string, ownerId: string): Promise<boolean> {
  if (hasLiveSupabase()) {
    try {
      const supabase = await getAcademyWritableClient();
      const { data, error } = await (supabase.from(COURSES_TABLE) as any)
        .select("id")
        .eq("id", courseId)
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (error) throw databaseError(error);
      return Boolean(data?.id);
    } catch (err) {
      if (err instanceof CoursePersistenceError) throw err;
      throw databaseError(err);
    }
  }
  return courseId === "crs-seed-draft" || ownerId === "prof-seed-1";
}

async function applySequentialSortOrder(
  table: string,
  parentColumn: string,
  parentId: string,
  orderedIds: string[]
): Promise<void> {
  const supabase = await getAcademyWritableClient();
  const now = new Date().toISOString();

  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await (supabase.from(table) as any)
      .update({ sort_order: SORT_ORDER_OFFSET + index + 1, updated_at: now })
      .eq("id", orderedIds[index])
      .eq(parentColumn, parentId);
    if (error) throw databaseError(error);
  }

  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await (supabase.from(table) as any)
      .update({ sort_order: index + 1, updated_at: now })
      .eq("id", orderedIds[index])
      .eq(parentColumn, parentId);
    if (error) throw databaseError(error);
  }
}

export type { CourseEditorTree, LessonWithVideo, SectionWithLessons };

export class AcademyAuthoringService {
  public static resetMemoryStore(): void {
    seedMemoryStore();
  }

  public static clearMemoryStore(): void {
    memorySections.length = 0;
    memoryLessons.length = 0;
  }

  public static async getCourseEditorTree(
    courseId: string,
    ownerId: string
  ): Promise<CourseEditorTree | null> {
    if (!(await assertCourseOwner(courseId, ownerId))) return null;

    if (hasLiveSupabase()) {
      const supabase = await getAcademyWritableClient();
      const { data: course, error: courseError } = await (supabase.from(COURSES_TABLE) as any)
        .select("*")
        .eq("id", courseId)
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (courseError) throw databaseError(courseError);
      if (!course) return null;

      const { data: sections, error: sectionsError } = await (supabase.from(SECTIONS_TABLE) as any)
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true });
      if (sectionsError) throw databaseError(sectionsError);

      const { data: lessons, error: lessonsError } = await (supabase.from(LESSONS_TABLE) as any)
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true });
      if (lessonsError) throw databaseError(lessonsError);

      const normalizedLessons = ((lessons || []) as Record<string, unknown>[]).map(normalizeLesson);
      const lessonsBySection = new Map<string, LessonWithVideo[]>();
      for (const lesson of normalizedLessons) {
        const list = lessonsBySection.get(lesson.section_id) || [];
        list.push(lesson);
        lessonsBySection.set(lesson.section_id, list);
      }

      return {
        ...(course as CourseWithSections),
        sections: ((sections || []) as Record<string, unknown>[]).map((section) => {
          const normalized = normalizeSection(section);
          return {
            ...normalized,
            lessons: lessonsBySection.get(normalized.id) || [],
          };
        }),
      };
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

    if (hasLiveSupabase()) {
      const supabase = await getAcademyWritableClient();
      const { data: existing, error: queryError } = await (supabase.from(SECTIONS_TABLE) as any)
        .select("id, sort_order")
        .eq("course_id", courseId);
      if (queryError) throw databaseError(queryError);

      const sort_order = nextSortOrder((existing || []) as Array<{ sort_order: number }>);
      const { data, error } = await (supabase.from(SECTIONS_TABLE) as any)
        .insert({ course_id: courseId, title, sort_order })
        .select()
        .single();
      if (error || !data) throw databaseError(error);
      return normalizeSection(data as Record<string, unknown>);
    }

    const existing = memorySections.filter((section) => section.course_id === courseId);
    const section: CourseSectionRecord = {
      id: `sec-${Date.now()}-${memorySections.length}`,
      course_id: courseId,
      title,
      sort_order: nextSortOrder(existing),
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
    if (hasLiveSupabase()) {
      const supabase = await getAcademyWritableClient();
      const { data: current, error: readError } = await (supabase.from(SECTIONS_TABLE) as any)
        .select("course_id")
        .eq("id", sectionId)
        .maybeSingle();
      if (readError) throw databaseError(readError);
      if (!current || !(await assertCourseOwner(current.course_id, ownerId))) return null;

      const { data, error } = await (supabase.from(SECTIONS_TABLE) as any)
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", sectionId)
        .select()
        .single();
      if (error || !data) throw databaseError(error);
      return normalizeSection(data as Record<string, unknown>);
    }

    const section = memorySections.find((item) => item.id === sectionId);
    if (!section || !(await assertCourseOwner(section.course_id, ownerId))) return null;
    const idx = memorySections.findIndex((item) => item.id === sectionId);
    memorySections[idx] = { ...memorySections[idx], title, updated_at: new Date().toISOString() };
    return memorySections[idx];
  }

  public static async deleteSection(ownerId: string, sectionId: string): Promise<boolean> {
    if (hasLiveSupabase()) {
      const supabase = await getAcademyWritableClient();
      const { data: current, error: readError } = await (supabase.from(SECTIONS_TABLE) as any)
        .select("course_id")
        .eq("id", sectionId)
        .maybeSingle();
      if (readError) throw databaseError(readError);
      if (!current || !(await assertCourseOwner(current.course_id, ownerId))) return false;
      const { error } = await (supabase.from(SECTIONS_TABLE) as any).delete().eq("id", sectionId);
      if (error) throw databaseError(error);
      return true;
    }

    const section = memorySections.find((item) => item.id === sectionId);
    if (!section || !(await assertCourseOwner(section.course_id, ownerId))) return false;
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
      await applySequentialSortOrder(SECTIONS_TABLE, "course_id", courseId, orderedSectionIds);
      const supabase = await getAcademyWritableClient();
      const { data, error } = await (supabase.from(SECTIONS_TABLE) as any)
        .select("*")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true });
      if (error) throw databaseError(error);
      return ((data || []) as Record<string, unknown>[]).map(normalizeSection);
    }

    const courseSections = memorySections.filter((section) => section.course_id === courseId);
    const reordered = reorderItems(courseSections, orderedSectionIds);
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
    const now = new Date().toISOString();

    if (hasLiveSupabase()) {
      const supabase = await getAcademyWritableClient();
      const { data: section, error: sectionError } = await (supabase.from(SECTIONS_TABLE) as any)
        .select("id, course_id")
        .eq("id", sectionId)
        .maybeSingle();
      if (sectionError) throw databaseError(sectionError);
      if (!section?.course_id || !(await assertCourseOwner(section.course_id, ownerId))) return null;

      const { data: existing, error: queryError } = await (supabase.from(LESSONS_TABLE) as any)
        .select("id, sort_order")
        .eq("section_id", sectionId);
      if (queryError) throw databaseError(queryError);

      const sort_order = nextSortOrder((existing || []) as Array<{ sort_order: number }>);
      const { data, error } = await (supabase.from(LESSONS_TABLE) as any)
        .insert({ course_id: section.course_id, section_id: sectionId, title, sort_order })
        .select()
        .single();
      if (error || !data) throw databaseError(error);
      return normalizeLesson(data as Record<string, unknown>);
    }

    const section = memorySections.find((item) => item.id === sectionId);
    if (!section || !(await assertCourseOwner(section.course_id, ownerId))) return null;
    const existing = memoryLessons.filter((lesson) => lesson.section_id === sectionId);
    const lesson: CourseLessonRecord = {
      id: `les-${Date.now()}-${memoryLessons.length}`,
      course_id: section.course_id,
      section_id: sectionId,
      title,
      description: null,
      sort_order: nextSortOrder(existing),
      academy_video_id: null,
      youtube_video_id: null,
      youtube_source_url: null,
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
    if (hasLiveSupabase()) {
      const supabase = await getAcademyWritableClient();
      const { data: current, error: readError } = await (supabase.from(LESSONS_TABLE) as any)
        .select("course_id")
        .eq("id", lessonId)
        .maybeSingle();
      if (readError) throw databaseError(readError);
      if (!current || !(await assertCourseOwner(current.course_id, ownerId))) return null;

      const { data, error } = await (supabase.from(LESSONS_TABLE) as any)
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", lessonId)
        .select()
        .single();
      if (error || !data) throw databaseError(error);
      return normalizeLesson(data as Record<string, unknown>);
    }

    const lesson = memoryLessons.find((item) => item.id === lessonId);
    if (!lesson || !(await assertCourseOwner(lesson.course_id, ownerId))) return null;
    const idx = memoryLessons.findIndex((item) => item.id === lessonId);
    memoryLessons[idx] = { ...memoryLessons[idx], ...patch, updated_at: new Date().toISOString() };
    return memoryLessons[idx];
  }

  public static async assignLessonYouTubeVideo(
    ownerId: string,
    lessonId: string,
    urlOrId: string | null
  ): Promise<CourseLessonRecord | null> {
    let youtubeVideoId: string | null = null;
    let youtubeSourceUrl: string | null = null;

    if (urlOrId != null && urlOrId.trim() !== "") {
      youtubeVideoId = extractYouTubeVideoId(urlOrId);
      if (!youtubeVideoId) {
        throw new CoursePersistenceError(
          "YOUTUBE_URL_INVALID",
          COURSE_MUTATION_MESSAGES.YOUTUBE_URL_INVALID
        );
      }
      youtubeSourceUrl = urlOrId.trim();
    }

    if (hasLiveSupabase()) {
      const supabase = await getAcademyWritableClient();
      const { data: current, error: readError } = await (supabase.from(LESSONS_TABLE) as any)
        .select("course_id")
        .eq("id", lessonId)
        .maybeSingle();
      if (readError) throw databaseError(readError);
      if (!current || !(await assertCourseOwner(current.course_id, ownerId))) return null;

      const { data, error } = await (supabase.from(LESSONS_TABLE) as any)
        .update({
          youtube_video_id: youtubeVideoId,
          youtube_source_url: youtubeSourceUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lessonId)
        .select()
        .single();
      if (error || !data) throw databaseError(error);
      return normalizeLesson(data as Record<string, unknown>);
    }

    const lesson = memoryLessons.find((item) => item.id === lessonId);
    if (!lesson || !(await assertCourseOwner(lesson.course_id, ownerId))) return null;
    const idx = memoryLessons.findIndex((item) => item.id === lessonId);
    memoryLessons[idx] = {
      ...memoryLessons[idx],
      youtube_video_id: youtubeVideoId,
      youtube_source_url: youtubeSourceUrl,
      academy_video_id: null,
      updated_at: new Date().toISOString(),
    };
    return memoryLessons[idx];
  }

  /** @deprecated Use assignLessonYouTubeVideo. Kept as a YouTube ID/URL alias. */
  public static async assignLessonVideo(
    ownerId: string,
    lessonId: string,
    videoId: string | null
  ): Promise<CourseLessonRecord | null> {
    return this.assignLessonYouTubeVideo(ownerId, lessonId, videoId);
  }

  public static async deleteLesson(ownerId: string, lessonId: string): Promise<boolean> {
    if (hasLiveSupabase()) {
      const supabase = await getAcademyWritableClient();
      const { data: current, error: readError } = await (supabase.from(LESSONS_TABLE) as any)
        .select("course_id")
        .eq("id", lessonId)
        .maybeSingle();
      if (readError) throw databaseError(readError);
      if (!current || !(await assertCourseOwner(current.course_id, ownerId))) return false;
      const { error } = await (supabase.from(LESSONS_TABLE) as any).delete().eq("id", lessonId);
      if (error) throw databaseError(error);
      return true;
    }

    const lesson = memoryLessons.find((item) => item.id === lessonId);
    if (!lesson || !(await assertCourseOwner(lesson.course_id, ownerId))) return false;
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
    if (hasLiveSupabase()) {
      const supabase = await getAcademyWritableClient();
      const { data: current, error: readError } = await (supabase.from(SECTIONS_TABLE) as any)
        .select("course_id")
        .eq("id", sectionId)
        .maybeSingle();
      if (readError) throw databaseError(readError);
      if (!current || !(await assertCourseOwner(current.course_id, ownerId))) return [];

      await applySequentialSortOrder(LESSONS_TABLE, "section_id", sectionId, orderedLessonIds);
      const { data, error } = await (supabase.from(LESSONS_TABLE) as any)
        .select("*")
        .eq("section_id", sectionId)
        .order("sort_order", { ascending: true });
      if (error) throw databaseError(error);
      return ((data || []) as Record<string, unknown>[]).map(normalizeLesson);
    }

    const section = memorySections.find((item) => item.id === sectionId);
    if (!section || !(await assertCourseOwner(section.course_id, ownerId))) return [];
    const sectionLessons = memoryLessons.filter((lesson) => lesson.section_id === sectionId);
    const reordered = reorderItems(sectionLessons, orderedLessonIds);
    for (const lesson of reordered) {
      const idx = memoryLessons.findIndex((item) => item.id === lesson.id);
      if (idx >= 0) memoryLessons[idx] = lesson;
    }
    return reordered;
  }

  public static countYouTubeReferences(youtubeVideoId: string): number {
    return memoryLessons.filter((lesson) => lesson.youtube_video_id === youtubeVideoId).length;
  }

  public static countVideoReferences(videoId: string): number {
    return this.countYouTubeReferences(videoId);
  }
}
