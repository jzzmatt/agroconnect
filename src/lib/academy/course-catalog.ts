import { isPubliclyVisibleCourseStatus } from "@/lib/academy/course-lifecycle";
import type { CourseListItem, SearchCoursesFilterParams } from "@/types/agriacademy";
import type { CourseCardProps } from "@/components/ui/CourseCard";
import type { CourseLevel, CourseStatus } from "@/types/database";

export type { SearchCoursesFilterParams };

const LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: "Iniciante",
  intermediate: "Intermédio",
  advanced: "Avançado",
  all_levels: "Todos os níveis",
};

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

export function mapCourseToCardProps(
  course: CourseListItem,
  options: { enrolled?: boolean; ctaLabel: string; ctaHref: string }
): CourseCardProps {
  return {
    id: course.id,
    slug: course.slug,
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
    enrolled: options.enrolled,
    ctaLabel: options.ctaLabel,
    ctaHref: options.ctaHref,
  };
}

export function mapCourseRow(row: Record<string, unknown>): CourseListItem {
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

export function filterSeedCourses(params: SearchCoursesFilterParams = {}): CourseListItem[] {
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
