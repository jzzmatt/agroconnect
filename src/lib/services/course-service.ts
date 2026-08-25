import { createPublicServerSupabaseClient } from "@/lib/supabase/client";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
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
  SearchCoursesFilterParams,
  UpdateCourseInput,
} from "@/types/agriacademy";
import type { CourseCardProps } from "@/components/ui/CourseCard";
import type { CourseLevel, CourseStatus } from "@/types/database";

export type { SearchCoursesFilterParams };

export function slugifyCourse(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: "Iniciante",
  intermediate: "Intermédio",
  advanced: "Avançado",
  all_levels: "Todos os níveis",
};

export function formatCoursePrice(price: number, currency = "AOA"): string {
  if (price <= 0) return "Gratuito";
  const formatted = Math.round(price)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return currency === "AOA" ? `${formatted} Kz` : `${formatted} ${currency}`;
}

export function courseLevelLabel(level: CourseLevel): string {
  return LEVEL_LABELS[level] ?? level;
}

export function mapCourseToCardProps(course: CourseListItem): CourseCardProps {
  return {
    id: course.id,
    title: course.title,
    instructorName: course.instructor_name,
    instructorRole: course.instructor_role ?? "Instrutor Especialista",
    provinceName: course.province_name ?? undefined,
    durationHours: course.duration_hours ?? 0,
    lessonsCount: course.lessons_count ?? 0,
    studentsCount: course.students_count ?? 0,
    priceFormatted: formatCoursePrice(course.price, course.currency),
    level: courseLevelLabel(course.level) as CourseCardProps["level"],
    category: course.category ?? "Formação Agrícola",
    thumbnailUrl: course.thumbnail_url ?? undefined,
  };
}

function mapCourseRow(row: Record<string, unknown>): CourseListItem {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    instructor_id: String(row.owner_id ?? row.instructor_id ?? ""),
    instructor_name: String(row.instructor_name ?? row.instructorName ?? "Instrutor"),
    instructor_avatar_url: (row.instructor_avatar_url as string | null) ?? null,
    instructor_role: (row.instructor_role as string | null) ?? "Instrutor Especialista",
    provider_id: (row.provider_id as string | null) ?? null,
    provider_slug: (row.provider_slug as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    short_description: (row.short_description as string | null) ?? null,
    level: (row.level as CourseLevel) ?? "all_levels",
    price: Number(row.price ?? 0),
    currency: String(row.currency ?? "AOA"),
    thumbnail_url: (row.thumbnail_url as string | null) ?? null,
    category: (row.category_name as string | null) ?? (row.category as string | null) ?? null,
    category_slug: (row.category_slug as string | null) ?? null,
    duration_hours: row.duration_hours != null ? Number(row.duration_hours) : null,
    lessons_count: row.lessons_count != null ? Number(row.lessons_count) : 0,
    students_count: row.students_count != null ? Number(row.students_count) : 0,
    rating: row.rating != null ? Number(row.rating) : null,
    province_name: (row.province_name as string | null) ?? null,
    municipality_name: (row.municipality_name as string | null) ?? null,
    status: row.status as CourseStatus,
    is_featured: Boolean(row.is_featured),
    created_at: String(row.created_at ?? new Date().toISOString()),
    published_at: (row.published_at as string | null) ?? null,
  };
}

/** Verified seed catalogue used when Supabase is unavailable (tests/dev). */
export const INITIAL_COURSES: CourseListItem[] = [
  {
    id: "crs-seed-1",
    title: "Maneio Intensivo e Nutrição de Gado Bovino em Angola",
    slug: "maneio-intensivo-nutricao-gado-bovino-angola",
    instructor_id: "prof-seed-1",
    instructor_name: "Dr. João Silva",
    instructor_role: "Médico Veterinário",
    provider_id: "prov-seed-1",
    provider_slug: "dr-joao-silva",
    short_description: "Nutrição e maneio intensivo de gado bovino adaptado ao contexto angolano.",
    description: "Formação completa em nutrição e maneio intensivo de gado bovino para produtores angolanos.",
    level: "intermediate",
    price: 45000,
    currency: "AOA",
    category: "Pecuária Bovina",
    category_slug: "pecuaria-bovina",
    duration_hours: 16,
    lessons_count: 22,
    students_count: 184,
    rating: 4.8,
    province_name: "Huambo",
    status: "published",
    is_featured: true,
    created_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  },
  {
    id: "crs-seed-2",
    title: "Horticultura Comercial e Sistemas de Rega Gota-a-Gota",
    slug: "horticultura-comercial-rega-gota-a-gota",
    instructor_id: "prof-seed-2",
    instructor_name: "Eng.ª Maria Santos",
    instructor_role: "Engenheira Agrónoma",
    provider_id: "prov-seed-2",
    provider_slug: "maria-santos-agronoma",
    short_description: "Horticultura comercial com sistemas de rega eficientes.",
    description: "Aprenda horticultura comercial e instalação de sistemas de rega gota-a-gota.",
    level: "beginner",
    price: 35000,
    currency: "AOA",
    category: "Horticultura",
    category_slug: "horticultura",
    duration_hours: 12,
    lessons_count: 16,
    students_count: 230,
    rating: 4.9,
    province_name: "Benguela",
    status: "published",
    is_featured: true,
    created_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  },
  {
    id: "crs-seed-3",
    title: "Cultivo e Gestão de Milho em Grande Escala no Planalto Central",
    slug: "cultivo-gestao-milho-grande-escala-planalto-central",
    instructor_id: "prof-seed-3",
    instructor_name: "Dr. Carlos Manuel",
    instructor_role: "Consultor Agrícola",
    provider_id: "prov-seed-3",
    provider_slug: "carlos-manuel-fitossanidade",
    short_description: "Gestão de milho em grande escala no Planalto Central.",
    description: "Técnicas avançadas de cultivo e gestão de milho em grande escala.",
    level: "advanced",
    price: 50000,
    currency: "AOA",
    category: "Grandes Culturas",
    category_slug: "grandes-culturas",
    duration_hours: 20,
    lessons_count: 28,
    students_count: 145,
    rating: 4.7,
    province_name: "Malanje",
    status: "published",
    is_featured: false,
    created_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  },
  {
    id: "crs-seed-draft",
    title: "Introdução à Avicultura de Corte (Rascunho)",
    slug: "introducao-avicultura-corte-rascunho",
    instructor_id: "prof-seed-1",
    instructor_name: "Dr. João Silva",
    instructor_role: "Médico Veterinário",
    provider_id: "prov-seed-1",
    provider_slug: "dr-joao-silva",
    level: "beginner",
    price: 25000,
    currency: "AOA",
    category: "Avicultura",
    duration_hours: 8,
    lessons_count: 10,
    students_count: 0,
    province_name: "Huambo",
    status: "draft",
    created_at: new Date().toISOString(),
  },
];

function filterSeedCourses(params: SearchCoursesFilterParams = {}): CourseListItem[] {
  let filtered = INITIAL_COURSES.filter((course) => isPubliclyVisibleCourseStatus(course.status));

  if (params.query) {
    const q = params.query.toLowerCase();
    filtered = filtered.filter(
      (course) =>
        course.title.toLowerCase().includes(q) ||
        course.instructor_name.toLowerCase().includes(q) ||
        (course.category && course.category.toLowerCase().includes(q)) ||
        (course.description && course.description.toLowerCase().includes(q))
    );
  }

  if (params.provinceName) {
    const province = params.provinceName.toLowerCase();
    filtered = filtered.filter((course) => course.province_name?.toLowerCase() === province);
  }

  if (params.level) {
    filtered = filtered.filter((course) => course.level === params.level);
  }

  if (params.minPrice != null) {
    filtered = filtered.filter((course) => course.price >= params.minPrice!);
  }

  if (params.maxPrice != null) {
    filtered = filtered.filter((course) => course.price <= params.maxPrice!);
  }

  const offset = params.offset ?? 0;
  const limit = params.limit ?? 20;
  return filtered.slice(offset, offset + limit);
}

function hasLiveSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
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
        const supabase = tryCreateAdminSupabaseClient() || createPublicServerSupabaseClient();
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
    const slug = input.slug || slugifyCourse(input.title);
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
      try {
        const supabase = tryCreateAdminSupabaseClient() || createPublicServerSupabaseClient();
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
          return data as CourseRecord;
        }
      } catch (err) {
        console.warn("[CourseService.createCourse] Using in-memory record:", err);
      }
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
        const supabase = tryCreateAdminSupabaseClient() || createPublicServerSupabaseClient();
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
        const supabase = tryCreateAdminSupabaseClient() || createPublicServerSupabaseClient();
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
