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
  isPubliclyVisibleCourseStatus,
} from "@/lib/academy/course-lifecycle";
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

export class CourseService {
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

    const courses = filterSeedCourses(params);
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

    const seed = INITIAL_COURSES.find((course) => course.slug === slug && course.status === "published");
    return seed ?? null;
  }

  /** Provider compatibility contract for future /providers/[slug] page. */
  public static async listPublishedCoursesByProviderSlug(
    providerSlug: string,
    params: SearchCoursesFilterParams = {}
  ): Promise<{ courses: CourseListItem[]; total: number }> {
    if (hasLiveSupabase()) {
      try {
        const supabase = createPublicServerSupabaseClient();
        const { data: provider } = await (supabase.from("provider_profiles") as any)
          .select("id")
          .eq("slug", providerSlug)
          .eq("status", "active")
          .maybeSingle();

        if (provider?.id) {
          let query = (supabase.from("courses") as any)
            .select("*", { count: "exact" })
            .eq("provider_id", provider.id)
            .eq("status", "published");

          const limit = params.limit ?? 20;
          const offset = params.offset ?? 0;
          query = query.order("published_at", { ascending: false }).range(offset, offset + limit - 1);

          const { data, error, count } = await query;
          if (!error && data) {
            const courses = await this.attachInstructorNames(supabase, data);
            return { courses, total: count ?? courses.length };
          }
        }
      } catch (err) {
        console.warn("[CourseService.listPublishedCoursesByProviderSlug] Fallback to seed:", err);
      }
    }

    const courses = filterSeedCourses(params).filter((course) => course.provider_slug === providerSlug);
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

    return INITIAL_COURSES.filter(
      (course) => course.instructor_id === ownerId && (includeDrafts || course.status === "published")
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

    return INITIAL_COURSES.filter((course) => courseIds.includes(course.id));
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

    const record: CourseRecord = {
      id: `crs-${Date.now()}`,
      owner_id: ownerId,
      provider_id: input.providerId ?? null,
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
          provider_id: input.providerId ?? null,
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
      throw new Error(error?.message || "Não foi possível criar o curso na base de dados.");
    }

    return record;
  }

  public static async updateCourse(
    ownerId: string,
    input: UpdateCourseInput
  ): Promise<CourseRecord | null> {
    const existing = INITIAL_COURSES.find((course) => course.id === input.id);
    if (existing && !this.isCourseOwner(existing, ownerId)) {
      return null;
    }

    const nextStatus = input.status
      ? this.transitionStatus(existing?.status ?? "draft", input.status)
      : existing?.status ?? "draft";

    const updated: CourseRecord = {
      id: input.id,
      owner_id: ownerId,
      provider_id: input.providerId ?? existing?.provider_id ?? null,
      category_id: input.categoryId ?? null,
      title: input.title ?? existing?.title ?? "",
      slug: input.slug ?? existing?.slug ?? "",
      short_description: input.shortDescription ?? existing?.short_description ?? null,
      description: input.description ?? existing?.description ?? null,
      level: input.level ?? existing?.level ?? "all_levels",
      price: input.price ?? existing?.price ?? 0,
      currency: input.currency ?? existing?.currency ?? "AOA",
      status: nextStatus,
      thumbnail_url: input.thumbnailUrl ?? existing?.thumbnail_url ?? null,
      duration_hours: existing?.duration_hours ?? null,
      lessons_count: existing?.lessons_count ?? 0,
      students_count: existing?.students_count ?? 0,
      rating: existing?.rating ?? null,
      province_name: input.provinceName ?? existing?.province_name ?? null,
      municipality_name: input.municipalityName ?? existing?.municipality_name ?? null,
      is_featured: existing?.is_featured ?? false,
      published_at:
        nextStatus === "published"
          ? existing?.published_at ?? new Date().toISOString()
          : existing?.published_at ?? null,
      metadata: {},
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (hasLiveSupabase()) {
      try {
        const supabase = await getAcademyWritableClient();
        const patch: Record<string, unknown> = {
          updated_at: updated.updated_at,
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
          if (nextStatus === "published" && !existing?.published_at) {
            patch.published_at = new Date().toISOString();
          }
        }

        const { data, error } = await (supabase.from("courses") as any)
          .update(patch)
          .eq("id", input.id)
          .eq("owner_id", ownerId)
          .select()
          .single();

        if (!error && data) {
          return data as CourseRecord;
        }
        if (error) return null;
      } catch (err) {
        console.warn("[CourseService.updateCourse] Using in-memory record:", err);
      }
    }

    return updated;
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
      return detail;
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
        provider_slug: provider?.slug ?? null,
        category_name: category?.name ?? null,
        category_slug: category?.slug ?? null,
      });
    });
  }
}
