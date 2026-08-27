import "server-only";

import { createPublicServerSupabaseClient } from "@/lib/supabase/client";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAcademyWritableClient } from "@/lib/academy/supabase-client";
import {
  filterSeedCourses,
  INITIAL_COURSES,
  mapCourseRow,
  slugifyCourse,
  type SearchCoursesFilterParams,
} from "@/lib/academy/course-catalog";
import {
  assertCourseStatusTransition,
  canPermanentlyDeleteCourse,
  isPubliclyVisibleCourseStatus,
} from "@/lib/academy/course-lifecycle";
import {
  CoursePersistenceError,
  COURSE_MUTATION_MESSAGES,
  mutationFail,
  mutationOk,
  type CourseMutationResult,
} from "@/lib/academy/course-errors";
import { publishedCourseBelongsToProvider } from "@/lib/academy/public-provider-courses";
import type {
  CourseListItem,
  CourseRecord,
  CourseSectionRecord,
  CourseLessonRecord,
  CourseWithSections,
  CreateCourseInput,
  UpdateCourseInput,
} from "@/types/agriacademy";
import type { CourseStatus } from "@/types/database";

export type { SearchCoursesFilterParams };
export {
  courseLevelLabel,
  formatCoursePrice,
  INITIAL_COURSES,
  mapCourseToCardProps,
  slugifyCourse,
} from "@/lib/academy/course-catalog";

function hasLiveSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

function isProviderRef(value?: string | null): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

async function resolveOwnerProviderId(
  ownerId: string,
  explicit?: string | null
): Promise<string | null> {
  if (explicit) return explicit;
  if (!hasLiveSupabase()) return null;
  try {
    const supabase = tryCreateAdminSupabaseClient() || createPublicServerSupabaseClient();
    const { data } = await (supabase.from("provider_profiles") as any)
      .select("id")
      .eq("profile_id", ownerId)
      .maybeSingle();
    return data?.id ? String(data.id) : null;
  } catch {
    return null;
  }
}

type MemoryCourseRecord = CourseRecord & { deleted?: boolean };

const memoryCourses = new Map<string, MemoryCourseRecord>();

function databaseError(cause?: unknown): CoursePersistenceError {
  return new CoursePersistenceError("DATABASE_ERROR", COURSE_MUTATION_MESSAGES.DATABASE_ERROR, cause);
}

function normalizeCourseRecord(row: Record<string, unknown>): CourseRecord {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    provider_id: (row.provider_id as string | null) ?? null,
    category_id: (row.category_id as string | null) ?? null,
    title: String(row.title),
    slug: String(row.slug),
    short_description: (row.short_description as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    level: (row.level as CourseRecord["level"]) ?? "all_levels",
    price: Number(row.price ?? 0),
    currency: String(row.currency ?? "AOA"),
    status: (row.status as CourseRecord["status"]) ?? "draft",
    thumbnail_url: (row.thumbnail_url as string | null) ?? null,
    duration_hours: row.duration_hours != null ? Number(row.duration_hours) : null,
    lessons_count: Number(row.lessons_count ?? 0),
    students_count: Number(row.students_count ?? 0),
    rating: row.rating != null ? Number(row.rating) : null,
    province_name: (row.province_name as string | null) ?? null,
    municipality_name: (row.municipality_name as string | null) ?? null,
    is_featured: Boolean(row.is_featured),
    published_at: (row.published_at as string | null) ?? null,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function listItemToRecord(item: CourseListItem): CourseRecord {
  return {
    id: item.id,
    owner_id: item.instructor_id,
    provider_id: item.provider_id ?? null,
    title: item.title,
    slug: item.slug,
    short_description: item.short_description ?? null,
    description: item.description ?? null,
    level: item.level,
    price: item.price,
    currency: item.currency,
    status: item.status,
    thumbnail_url: item.thumbnail_url ?? null,
    duration_hours: item.duration_hours ?? null,
    lessons_count: item.lessons_count ?? 0,
    students_count: item.students_count ?? 0,
    rating: item.rating ?? null,
    province_name: item.province_name ?? null,
    municipality_name: item.municipality_name ?? null,
    is_featured: item.is_featured ?? false,
    published_at: item.published_at ?? null,
    metadata: {},
    created_at: item.created_at,
    updated_at: item.created_at,
  };
}

function rememberCourse(record: CourseRecord): MemoryCourseRecord {
  const stored: MemoryCourseRecord = { ...record, deleted: false };
  memoryCourses.set(record.id, stored);
  return stored;
}

function resolveMemoryCourse(courseId: string): MemoryCourseRecord | null {
  const existing = memoryCourses.get(courseId);
  if (existing) return existing.deleted ? null : existing;
  const seed = INITIAL_COURSES.find((course) => course.id === courseId);
  if (!seed) return null;
  return rememberCourse(listItemToRecord(seed));
}

function applyMemoryOverlay(courses: CourseListItem[]): CourseListItem[] {
  return courses
    .map((course) => {
      const overlay = memoryCourses.get(course.id);
      if (!overlay) return course;
      if (overlay.deleted) return null;
      return {
        ...course,
        title: overlay.title,
        slug: overlay.slug,
        description: overlay.description,
        short_description: overlay.short_description,
        status: overlay.status,
        published_at: overlay.published_at,
        provider_id: overlay.provider_id ?? course.provider_id ?? null,
      };
    })
    .filter((course): course is CourseListItem => course !== null)
    .concat(
      [...memoryCourses.values()]
        .filter((record) => !record.deleted && !courses.some((course) => course.id === record.id))
        .map((record) => ({
          id: record.id,
          title: record.title,
          slug: record.slug,
          instructor_id: record.owner_id,
          instructor_name: "Instrutor",
          provider_id: record.provider_id ?? null,
          provider_slug: null,
          description: record.description,
          short_description: record.short_description,
          level: record.level,
          price: record.price,
          currency: record.currency,
          status: record.status,
          thumbnail_url: record.thumbnail_url,
          duration_hours: record.duration_hours,
          lessons_count: record.lessons_count,
          students_count: record.students_count,
          rating: record.rating,
          province_name: record.province_name,
          municipality_name: record.municipality_name,
          is_featured: record.is_featured,
          created_at: record.created_at,
          published_at: record.published_at,
        }))
    );
}

/** Public catalogue must not expose Unlisted YouTube IDs. Playback goes through enrollment-gated APIs. */
function redactPublicCourseYouTubeIds(course: CourseWithSections): CourseWithSections {
  return {
    ...course,
    sections: course.sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => ({
        ...lesson,
        youtube_video_id: null,
        youtube_source_url: null,
      })),
    })),
  };
}

export class CourseService {
  public static resetMemoryStore(): void {
    memoryCourses.clear();
  }

  /** Public catalogue — only published courses. */
  public static async searchPublishedCourses(
    params: SearchCoursesFilterParams = {}
  ): Promise<{ courses: CourseListItem[]; total: number }> {
    if (hasLiveSupabase()) {
      try {
        const supabase = createPublicServerSupabaseClient();
        let query = (supabase.from("courses") as any)
          .select(
            `
            *,
            provider_profiles:provider_id ( slug, business_name ),
            categories:category_id ( name, slug )
          `,
            { count: "exact" }
          )
          .eq("status", "published");

        if (params.query) {
          const q = params.query.replace(/[%_]/g, "");
          query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,short_description.ilike.%${q}%`);
        }
        if (params.provinceName) {
          query = query.ilike("province_name", params.provinceName);
        }
        if (params.level) {
          query = query.eq("level", params.level);
        }
        if (params.minPrice != null) {
          query = query.gte("price", params.minPrice);
        }
        if (params.maxPrice != null) {
          query = query.lte("price", params.maxPrice);
        }

        const limit = params.limit ?? 20;
        const offset = params.offset ?? 0;
        query = query.order("published_at", { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (!error && data && Array.isArray(data) && data.length > 0) {
          const courses = await this.attachInstructorNames(supabase, data);
          return { courses, total: count ?? courses.length };
        }
      } catch (err) {
        console.warn("[CourseService.searchPublishedCourses] Fallback to seed:", err);
      }
    }

    const courses = applyMemoryOverlay(filterSeedCourses(params)).filter((course) =>
      isPubliclyVisibleCourseStatus(course.status)
    );
    return { courses, total: courses.length };
  }

  public static async getPublishedCourseBySlug(slug: string): Promise<CourseListItem | null> {
    if (hasLiveSupabase()) {
      try {
        const supabase = createPublicServerSupabaseClient();
        const { data, error } = await (supabase.from("courses") as any)
          .select(
            `
            *,
            provider_profiles:provider_id ( slug, business_name ),
            categories:category_id ( name, slug )
          `
          )
          .eq("slug", slug)
          .eq("status", "published")
          .maybeSingle();

        if (!error && data) {
          const [mapped] = await this.attachInstructorNames(supabase, [data]);
          return mapped ?? null;
        }
      } catch (err) {
        console.warn("[CourseService.getPublishedCourseBySlug] Fallback to seed:", err);
      }
    }

    const seed = applyMemoryOverlay(INITIAL_COURSES).find(
      (course) => course.slug === slug && isPubliclyVisibleCourseStatus(course.status)
    );
    return seed ?? null;
  }

  /** Public /providers/[slug] contract: published Academy courses only. */
  public static async listPublishedCoursesByProviderSlug(
    providerSlug: string,
    params: SearchCoursesFilterParams = {}
  ): Promise<{ courses: CourseListItem[]; total: number }> {
    return this.listPublishedCoursesForProvider({ slug: providerSlug }, params);
  }

  public static async listPublishedCoursesForProvider(
    ref: { id?: string | null; slug?: string | null },
    params: SearchCoursesFilterParams = {}
  ): Promise<{ courses: CourseListItem[]; total: number }> {
    const slug = ref.slug?.trim() || "";
    const id = ref.id?.trim() || "";
    if (!slug && !id) return { courses: [], total: 0 };

    if (hasLiveSupabase()) {
      try {
        const reader = tryCreateAdminSupabaseClient() || createPublicServerSupabaseClient();
        let provider: { id?: string; profile_id?: string; slug?: string } | null = null;

        if (id) {
          const { data } = await (reader.from("provider_profiles") as any)
            .select("id, profile_id, slug")
            .eq("id", id)
            .eq("publication_state", "published")
            .maybeSingle();
          provider = data;
        }

        if (!provider && slug) {
          const { data } = await (reader.from("provider_profiles") as any)
            .select("id, profile_id, slug")
            .eq("slug", slug)
            .eq("publication_state", "published")
            .maybeSingle();
          provider = data;
        }

        if (!provider && slug && isProviderRef(slug)) {
          const { data } = await (reader.from("provider_profiles") as any)
            .select("id, profile_id, slug")
            .eq("id", slug)
            .eq("publication_state", "published")
            .maybeSingle();
          provider = data;
        }

        if (provider?.id || provider?.profile_id) {
          const supabase = tryCreateAdminSupabaseClient() || createPublicServerSupabaseClient();
          const limit = params.limit ?? 50;
          const offset = params.offset ?? 0;
          const rows = await this.fetchPublishedCourseRowsForProvider(supabase, {
            providerId: provider.id ? String(provider.id) : null,
            ownerId: provider.profile_id ? String(provider.profile_id) : null,
            limit,
            offset,
          });

          if (rows) {
            const courses = (await this.attachInstructorNames(supabase, rows))
              .map((course) => ({
                ...course,
                provider_id: course.provider_id ?? (provider.id ? String(provider.id) : null),
                provider_slug: course.provider_slug ?? provider.slug ?? (slug || null),
              }))
              .filter((course) =>
                publishedCourseBelongsToProvider(course, {
                  id: provider.id ? String(provider.id) : null,
                  profileId: provider.profile_id ? String(provider.profile_id) : null,
                  slug: String(provider.slug || slug || ""),
                })
              );
            return { courses, total: courses.length };
          }
        }
      } catch (err) {
        console.warn("[CourseService.listPublishedCoursesForProvider] Fallback to seed:", err);
      }
    }

    const courses = applyMemoryOverlay(filterSeedCourses(params)).filter((course) =>
      publishedCourseBelongsToProvider(course, {
        id: id || null,
        slug,
      })
    );
    return { courses, total: courses.length };
  }

  public static async listByOwner(ownerId: string, includeDrafts = true): Promise<CourseListItem[]> {
    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        let query = (supabase.from("courses") as any).select("*").eq("owner_id", ownerId);
        if (!includeDrafts) {
          query = query.eq("status", "published");
        }
        const { data, error } = await query.order("created_at", { ascending: false });
        if (!error && data) {
          return this.attachInstructorNames(supabase, data);
        }
      } catch (err) {
        console.warn("[CourseService.listByOwner] Fallback to seed:", err);
      }
    }

    return applyMemoryOverlay(INITIAL_COURSES).filter(
      (course) =>
        course.instructor_id === ownerId &&
        (includeDrafts || isPubliclyVisibleCourseStatus(course.status))
    );
  }

  public static async getCoursesByIds(courseIds: string[]): Promise<CourseListItem[]> {
    if (courseIds.length === 0) return [];

    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const { data, error } = await (supabase.from("courses") as any)
          .select("*")
          .in("id", courseIds);
        if (!error && data) {
          const mapped = await this.attachInstructorNames(supabase, data);
          const order = new Map(courseIds.map((id, index) => [id, index]));
          return mapped.sort(
            (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
          );
        }
      } catch (err) {
        console.warn("[CourseService.getCoursesByIds] Fallback to seed:", err);
      }
    }

    return applyMemoryOverlay(INITIAL_COURSES).filter((course) => courseIds.includes(course.id));
  }

  public static isCourseOwner(course: Pick<CourseListItem, "instructor_id">, ownerId: string): boolean {
    return course.instructor_id === ownerId;
  }

  public static canInstructorManageCourse(
    course: Pick<CourseListItem, "instructor_id">,
    profileId: string
  ): boolean {
    return this.isCourseOwner(course, profileId);
  }

  public static transitionStatus(current: CourseStatus, next: CourseStatus): CourseStatus {
    assertCourseStatusTransition(current, next);
    return next;
  }

  public static async createCourse(ownerId: string, input: CreateCourseInput): Promise<CourseRecord> {
    const baseSlug = input.slug || slugifyCourse(input.title);
    const slug =
      input.slug
        ? baseSlug
        : hasLiveSupabase()
          ? `${baseSlug}-${Date.now().toString(36)}`
          : baseSlug;
    const now = new Date().toISOString();
    const providerId = await resolveOwnerProviderId(ownerId, input.providerId);

    const record: CourseRecord = {
      id: `crs-${Date.now()}`,
      owner_id: ownerId,
      provider_id: providerId,
      category_id: input.categoryId ?? null,
      title: input.title,
      slug,
      short_description: input.shortDescription ?? null,
      description: input.description ?? null,
      level: input.level ?? "all_levels",
      price: input.price ?? 0,
      currency: input.currency ?? "AOA",
      status: "draft",
      thumbnail_url: input.thumbnailUrl ?? null,
      duration_hours: null,
      lessons_count: 0,
      students_count: 0,
      rating: null,
      province_name: input.provinceName ?? null,
      municipality_name: input.municipalityName ?? null,
      is_featured: false,
      published_at: null,
      metadata: {},
      created_at: now,
      updated_at: now,
    };

    if (hasLiveSupabase()) {
      const supabase = await getAcademyWritableClient();
      const { data, error } = await (supabase.from("courses") as any)
        .insert({
          owner_id: ownerId,
          provider_id: providerId,
          category_id: input.categoryId ?? null,
          title: input.title,
          slug,
          short_description: input.shortDescription ?? null,
          description: input.description ?? null,
          level: input.level ?? "all_levels",
          price: input.price ?? 0,
          currency: input.currency ?? "AOA",
          status: "draft",
          thumbnail_url: input.thumbnailUrl ?? null,
          province_name: input.provinceName ?? null,
          municipality_name: input.municipalityName ?? null,
        })
        .select()
        .single();
      if (!error && data) {
        return normalizeCourseRecord(data as Record<string, unknown>);
      }
      throw databaseError(error);
    }

    rememberCourse(record);
    return record;
  }

  public static async getOwnedCourse(
    ownerId: string,
    courseId: string
  ): Promise<CourseMutationResult<CourseRecord>> {
    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const { data, error } = await (supabase.from("courses") as any)
          .select("*")
          .eq("id", courseId)
          .maybeSingle();
        if (error) return mutationFail("DATABASE_ERROR");
        if (!data) return mutationFail("COURSE_NOT_FOUND");
        const record = normalizeCourseRecord(data as Record<string, unknown>);
        if (record.owner_id !== ownerId) return mutationFail("UNAUTHORIZED");
        return mutationOk(record);
      } catch {
        return mutationFail("DATABASE_ERROR", COURSE_MUTATION_MESSAGES.DATABASE_ERROR);
      }
    }

    const existing = resolveMemoryCourse(courseId);
    if (!existing) return mutationFail("COURSE_NOT_FOUND");
    if (existing.owner_id !== ownerId) return mutationFail("UNAUTHORIZED");
    return mutationOk(existing);
  }

  public static async updateCourse(
    ownerId: string,
    input: UpdateCourseInput
  ): Promise<CourseMutationResult<CourseRecord>> {
    const current = await this.getOwnedCourse(ownerId, input.id);
    if (!current.success) return current;

    let nextStatus = current.data.status;
    if (input.status && input.status !== current.data.status) {
      try {
        nextStatus = this.transitionStatus(current.data.status, input.status);
      } catch (err) {
        return mutationFail(
          "INVALID_STATE_TRANSITION",
          err instanceof Error ? err.message : COURSE_MUTATION_MESSAGES.INVALID_STATE_TRANSITION
        );
      }
    }

    const now = new Date().toISOString();
    const publishedAt =
      nextStatus === "published"
        ? current.data.published_at ?? now
        : current.data.published_at ?? null;

    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const patch: Record<string, unknown> = {
          updated_at: now,
        };
        if (input.title) patch.title = input.title;
        if (input.slug) patch.slug = input.slug;
        if (input.shortDescription !== undefined) patch.short_description = input.shortDescription;
        if (input.description !== undefined) patch.description = input.description;
        if (input.level) patch.level = input.level;
        if (input.price !== undefined) patch.price = input.price;
        if (input.currency) patch.currency = input.currency;
        if (input.thumbnailUrl !== undefined) patch.thumbnail_url = input.thumbnailUrl;
        if (input.provinceName !== undefined) patch.province_name = input.provinceName;
        if (input.municipalityName !== undefined) patch.municipality_name = input.municipalityName;
        if (input.status) {
          patch.status = nextStatus;
          if (nextStatus === "published" && !current.data.published_at) {
            patch.published_at = now;
          }
          if (nextStatus === "published" && !current.data.provider_id) {
            const providerId = await resolveOwnerProviderId(ownerId, input.providerId);
            if (providerId) patch.provider_id = providerId;
          }
        }

        const { data, error } = await (supabase.from("courses") as any)
          .update(patch)
          .eq("id", input.id)
          .eq("owner_id", ownerId)
          .select()
          .maybeSingle();

        if (error) return mutationFail("DATABASE_ERROR");
        if (!data) return mutationFail("COURSE_NOT_FOUND");
        return mutationOk(normalizeCourseRecord(data as Record<string, unknown>));
      } catch {
        return mutationFail("DATABASE_ERROR");
      }
    }

    const updated: CourseRecord = {
      ...current.data,
      provider_id: input.providerId ?? current.data.provider_id ?? null,
      category_id: input.categoryId ?? current.data.category_id ?? null,
      title: input.title ?? current.data.title,
      slug: input.slug ?? current.data.slug,
      short_description: input.shortDescription ?? current.data.short_description ?? null,
      description: input.description ?? current.data.description ?? null,
      level: input.level ?? current.data.level,
      price: input.price ?? current.data.price,
      currency: input.currency ?? current.data.currency,
      status: nextStatus,
      thumbnail_url: input.thumbnailUrl ?? current.data.thumbnail_url ?? null,
      province_name: input.provinceName ?? current.data.province_name ?? null,
      municipality_name: input.municipalityName ?? current.data.municipality_name ?? null,
      published_at: publishedAt,
      updated_at: now,
    };
    rememberCourse(updated);
    return mutationOk(updated);
  }

  /**
   * Permanently delete a course. Published courses are rejected using the
   * current database/memory status — never a client-supplied status.
   * Sections and lessons cascade. YouTube videos are never deleted.
   */
  public static async deleteCourse(
    ownerId: string,
    courseId: string
  ): Promise<CourseMutationResult<{ id: string }>> {
    const current = await this.getOwnedCourse(ownerId, courseId);
    if (!current.success) {
      if (current.code === "UNAUTHORIZED") {
        return mutationFail("UNAUTHORIZED", "Não tem permissão para eliminar este curso.");
      }
      return current;
    }

    if (current.data.status === "published") {
      return mutationFail("COURSE_PUBLISHED");
    }

    if (!canPermanentlyDeleteCourse(current.data.status)) {
      return mutationFail("INVALID_STATE_TRANSITION");
    }

    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const { data: latest, error: latestError } = await (supabase.from("courses") as any)
          .select("id, status, owner_id")
          .eq("id", courseId)
          .maybeSingle();
        if (latestError) return mutationFail("DATABASE_ERROR");
        if (!latest) return mutationFail("COURSE_NOT_FOUND");
        if (latest.owner_id !== ownerId) {
          return mutationFail("UNAUTHORIZED", "Não tem permissão para eliminar este curso.");
        }
        if (latest.status === "published") return mutationFail("COURSE_PUBLISHED");

        const { error } = await (supabase.from("courses") as any)
          .delete()
          .eq("id", courseId)
          .eq("owner_id", ownerId);
        if (error) {
          const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
          if (code === "23503") return mutationFail("DEPENDENCY_ERROR");
          return mutationFail("DATABASE_ERROR");
        }

        const { data: remaining, error: confirmError } = await (supabase.from("courses") as any)
          .select("id")
          .eq("id", courseId)
          .maybeSingle();
        if (confirmError) return mutationFail("DATABASE_ERROR");
        if (remaining) return mutationFail("DATABASE_ERROR");
        return mutationOk({ id: courseId });
      } catch {
        return mutationFail("DATABASE_ERROR");
      }
    }

    const stored = memoryCourses.get(courseId) ?? rememberCourse(current.data);
    stored.deleted = true;
    return mutationOk({ id: courseId });
  }

  public static async getCourseWithSections(courseId: string): Promise<CourseWithSections | null> {
    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const { data: course, error } = await (supabase.from("courses") as any)
          .select("*")
          .eq("id", courseId)
          .maybeSingle();
        if (error || !course) return null;

        const { data: sections } = await (supabase.from("course_sections") as any)
          .select("*")
          .eq("course_id", courseId)
          .order("sort_order", { ascending: true });

        const { data: lessons } = await (supabase.from("course_lessons") as any)
          .select("*")
          .eq("course_id", courseId)
          .order("sort_order", { ascending: true });

        const lessonsBySection = new Map<string, typeof lessons>();
        for (const lesson of lessons || []) {
          const list = lessonsBySection.get(lesson.section_id) || [];
          list.push(lesson);
          lessonsBySection.set(lesson.section_id, list);
        }

        return {
          ...(course as CourseRecord),
          sections: (sections || []).map((section: CourseSectionRecord) => ({
            ...section,
            lessons: (lessonsBySection.get(section.id) || []) as CourseLessonRecord[],
          })),
        };
      } catch (err) {
        console.warn("[CourseService.getCourseWithSections] Unavailable:", err);
      }
    }

    return null;
  }

  public static async getPublishedCourseDetailBySlug(slug: string): Promise<CourseWithSections | null> {
    const summary = await this.getPublishedCourseBySlug(slug);
    if (!summary) return null;

    const detail = await this.getCourseWithSections(summary.id);
    if (detail && detail.status === "published") {
      return redactPublicCourseYouTubeIds(detail);
    }

    if (!hasLiveSupabase()) {
      return {
        id: summary.id,
        owner_id: summary.instructor_id,
        title: summary.title,
        slug: summary.slug,
        description: summary.description,
        short_description: summary.short_description,
        level: summary.level,
        price: summary.price,
        currency: summary.currency,
        status: "published",
        lessons_count: summary.lessons_count ?? 0,
        students_count: summary.students_count ?? 0,
        is_featured: summary.is_featured ?? false,
        created_at: summary.created_at,
        updated_at: summary.created_at,
        sections: [],
      };
    }

    return null;
  }

  /**
   * Learner lookup by slug, including paused/archived courses.
   * Callers must still authorize enrollment before rendering the learning UI.
   * YouTube IDs stay redacted; playback goes through the enrollment-gated API.
   */
  public static async getLearnerCourseDetailBySlug(slug: string): Promise<CourseWithSections | null> {
    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const { data, error } = await (supabase.from("courses") as any)
          .select("*")
          .eq("slug", slug)
          .maybeSingle();
        if (error || !data?.id) return null;
        const detail = await this.getCourseWithSections(String(data.id));
        return detail ? redactPublicCourseYouTubeIds(detail) : null;
      } catch (err) {
        console.warn("[CourseService.getLearnerCourseDetailBySlug] Unavailable:", err);
      }
    }

    const stored = [...memoryCourses.values()].find(
      (course) => course.slug === slug && !course.deleted
    );
    if (stored) {
      return { ...stored, sections: [] };
    }

    const overlay = applyMemoryOverlay(INITIAL_COURSES).find((course) => course.slug === slug);
    if (!overlay) return null;
    return {
      id: overlay.id,
      owner_id: overlay.instructor_id,
      title: overlay.title,
      slug: overlay.slug,
      description: overlay.description,
      short_description: overlay.short_description,
      level: overlay.level,
      price: overlay.price,
      currency: overlay.currency,
      status: overlay.status,
      thumbnail_url: overlay.thumbnail_url,
      duration_hours: overlay.duration_hours,
      lessons_count: overlay.lessons_count ?? 0,
      students_count: overlay.students_count ?? 0,
      is_featured: overlay.is_featured ?? false,
      created_at: overlay.created_at,
      updated_at: overlay.created_at,
      published_at: overlay.published_at,
      sections: [],
    };
  }

  public static async isCoursePublished(courseId: string): Promise<boolean> {
    if (hasLiveSupabase()) {
      try {
        const supabase = createPublicServerSupabaseClient();
        const { data, error } = await (supabase.from("courses") as any)
          .select("id")
          .eq("id", courseId)
          .eq("status", "published")
          .maybeSingle();
        if (!error && data) return true;
      } catch (err) {
        console.warn("[CourseService.isCoursePublished] Direct lookup failed:", err);
      }
    }

    const { courses } = await this.searchPublishedCourses({ limit: 200 });
    return courses.some((course) => course.id === courseId);
  }

  private static async fetchPublishedCourseRowsForProvider(
    supabase: ReturnType<typeof createPublicServerSupabaseClient>,
    params: {
      providerId?: string | null;
      ownerId?: string | null;
      limit: number;
      offset: number;
    }
  ): Promise<Array<Record<string, unknown>> | null> {
    const take = Math.max(params.limit + params.offset, params.limit);
    const queries: Array<Promise<{ data: unknown; error: { message?: string } | null }>> = [];

    if (params.providerId) {
      queries.push(
        (supabase.from("courses") as any)
          .select("*")
          .eq("status", "published")
          .eq("provider_id", params.providerId)
          .order("published_at", { ascending: false })
          .limit(take)
      );
    }

    if (params.ownerId) {
      queries.push(
        (supabase.from("courses") as any)
          .select("*")
          .eq("status", "published")
          .eq("owner_id", params.ownerId)
          .order("published_at", { ascending: false })
          .limit(take)
      );
    }

    if (queries.length === 0) return [];

    const results = await Promise.all(queries);
    if (results.every((result) => result.error)) return null;

    const byId = new Map<string, Record<string, unknown>>();
    for (const result of results) {
      if (result.error || !Array.isArray(result.data)) continue;
      for (const row of result.data as Array<Record<string, unknown>>) {
        const rowId = String(row.id || "");
        if (rowId) byId.set(rowId, row);
      }
    }

    return [...byId.values()]
      .sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")))
      .slice(params.offset, params.offset + params.limit);
  }

  private static async attachInstructorNames(
    supabase: ReturnType<typeof createPublicServerSupabaseClient>,
    rows: Array<Record<string, unknown>>
  ): Promise<CourseListItem[]> {
    const ownerIds = [...new Set(rows.map((row) => String(row.owner_id)).filter(Boolean))];
    const profileMap = new Map<string, { display_name: string; avatar_url: string | null }>();

    if (ownerIds.length > 0) {
      const client = tryCreateAdminSupabaseClient() || supabase;
      const { data: profiles } = await (client.from("profiles") as any)
        .select("id, display_name, avatar_url")
        .in("id", ownerIds);
      for (const profile of profiles || []) {
        profileMap.set(profile.id, {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        });
      }
    }

    return rows.map((row) => {
      const provider = row.provider_profiles as { slug?: string; business_name?: string } | null;
      const category = row.categories as { name?: string; slug?: string } | null;
      const profile = profileMap.get(String(row.owner_id));
      return mapCourseRow({
        ...row,
        instructor_name: profile?.display_name ?? provider?.business_name ?? "Instrutor",
        instructor_avatar_url: profile?.avatar_url ?? null,
        provider_slug: provider?.slug ?? (row.provider_slug as string | null) ?? null,
        category_name: category?.name ?? null,
        category_slug: category?.slug ?? null,
      });
    });
  }
}
