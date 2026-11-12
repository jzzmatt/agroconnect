import type {
  CourseLessonRecord,
  CourseListItem,
  CourseSectionRecord,
  CourseWithSections,
} from "@/types/agriacademy";
import { DEMO_MEDIA } from "./media";
import { demoProviderById } from "./providers";

const CREATED_AT = "2026-01-15T09:00:00.000Z";

export type DemoCourse = CourseWithSections & { isDemo: true; list: CourseListItem & { isDemo: true } };

function lesson(
  courseId: string,
  sectionId: string,
  id: string,
  title: string,
  sortOrder: number,
  preview = false
): CourseLessonRecord {
  return {
    id,
    course_id: courseId,
    section_id: sectionId,
    title,
    description: null,
    sort_order: sortOrder,
    youtube_video_id: null,
    youtube_source_url: null,
    is_free_preview: preview,
    duration_seconds: 12 * 60,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
  };
}

function section(
  courseId: string,
  id: string,
  title: string,
  sortOrder: number,
  lessons: CourseLessonRecord[]
): CourseSectionRecord & { lessons: CourseLessonRecord[] } {
  return {
    id,
    course_id: courseId,
    title,
    sort_order: sortOrder,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    lessons,
  };
}

function course(input: {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  providerId: string;
  category: string;
  categorySlug: string;
  level: CourseWithSections["level"];
  price: number;
  hours: number;
  thumbnail: string;
  province: string;
  municipality: string;
  featured?: boolean;
  sections: Array<CourseSectionRecord & { lessons: CourseLessonRecord[] }>;
}): DemoCourse {
  const provider = demoProviderById(input.providerId);
  if (!provider) throw new Error(`Demo provider em falta: ${input.providerId}`);
  const lessonsCount = input.sections.reduce((sum, item) => sum + item.lessons.length, 0);
  const list: CourseListItem & { isDemo: true } = {
    isDemo: true,
    id: input.id,
    title: input.title,
    slug: input.slug,
    instructor_id: provider.profile_id,
    instructor_name: provider.business_name,
    instructor_avatar_url: provider.avatar_url,
    instructor_role: "Formador convidado",
    provider_id: provider.id,
    provider_slug: provider.slug,
    description: input.description,
    short_description: input.shortDescription,
    level: input.level,
    price: input.price,
    currency: "AOA",
    thumbnail_url: input.thumbnail,
    category: input.category,
    category_slug: input.categorySlug,
    duration_hours: input.hours,
    lessons_count: lessonsCount,
    students_count: 24,
    rating: 4.8,
    province_name: input.province,
    municipality_name: input.municipality,
    status: "published",
    is_featured: input.featured ?? false,
    created_at: CREATED_AT,
    published_at: CREATED_AT,
  };
  return {
    ...list,
    isDemo: true,
    list,
    owner_id: provider.profile_id,
    provider_id: provider.id,
    short_description: input.shortDescription,
    description: input.description,
    level: input.level,
    price: input.price,
    currency: "AOA",
    status: "published",
    thumbnail_url: input.thumbnail,
    location_name: `${input.municipality}, ${input.province}`,
    duration_hours: input.hours,
    lessons_count: lessonsCount,
    students_count: 24,
    rating: 4.8,
    province_name: input.province,
    municipality_name: input.municipality,
    is_featured: input.featured ?? false,
    published_at: CREATED_AT,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    sections: input.sections,
  };
}

const maizeSections = [
  section("demo-course-milho", "demo-section-milho-1", "Preparar a campanha", 1, [
    lesson("demo-course-milho", "demo-section-milho-1", "demo-lesson-milho-1", "Escolher a variedade e a densidade", 1, true),
    lesson("demo-course-milho", "demo-section-milho-1", "demo-lesson-milho-2", "Preparar o solo no Planalto", 2),
  ]),
  section("demo-course-milho", "demo-section-milho-2", "Conduzir a cultura", 2, [
    lesson("demo-course-milho", "demo-section-milho-2", "demo-lesson-milho-3", "Adubação de arranque e de cobertura", 1),
    lesson("demo-course-milho", "demo-section-milho-2", "demo-lesson-milho-4", "Pragas frequentes e colheita", 2),
  ]),
];

const cattleSections = [
  section("demo-course-pecuaria", "demo-section-gado-1", "Sanidade do rebanho", 1, [
    lesson("demo-course-pecuaria", "demo-section-gado-1", "demo-lesson-gado-1", "Calendário de vacinação", 1, true),
    lesson("demo-course-pecuaria", "demo-section-gado-1", "demo-lesson-gado-2", "Observar a condição corporal", 2),
  ]),
  section("demo-course-pecuaria", "demo-section-gado-2", "Maneio na mangueira", 2, [
    lesson("demo-course-pecuaria", "demo-section-gado-2", "demo-lesson-gado-3", "Água, sombra e pastagem", 1),
    lesson("demo-course-pecuaria", "demo-section-gado-2", "demo-lesson-gado-4", "Registar nascimentos e tratamentos", 2),
  ]),
];

const waterSections = [
  section("demo-course-rega", "demo-section-rega-1", "Água na parcela", 1, [
    lesson("demo-course-rega", "demo-section-rega-1", "demo-lesson-rega-1", "Medir a necessidade de água", 1, true),
    lesson("demo-course-rega", "demo-section-rega-1", "demo-lesson-rega-2", "Escolher gota-a-gota ou aspersão", 2),
  ]),
  section("demo-course-rega", "demo-section-rega-2", "Operar o sistema", 2, [
    lesson("demo-course-rega", "demo-section-rega-2", "demo-lesson-rega-3", "Filtros, pressão e fugas", 1),
    lesson("demo-course-rega", "demo-section-rega-2", "demo-lesson-rega-4", "Calendário de rega na estação seca", 2),
  ]),
];

export const DEMO_COURSES: DemoCourse[] = [
  course({
    id: "demo-course-milho",
    slug: "demo-curso-milho-planalto",
    title: "Milho no Planalto Central",
    shortDescription: "Da escolha da semente à colheita, numa campanha de Huambo.",
    description:
      "Curso prático para quem vai semear milho em Caála e municípios vizinhos. Quatro aulas cobrem variedade, solo, adubação e colheita. Os preços estão em kwanza e as aulas são material de demonstração.",
    providerId: "demo-provider-huambo",
    category: "Culturas",
    categorySlug: "culturas",
    level: "beginner",
    price: 15000,
    hours: 4,
    thumbnail: DEMO_MEDIA.courseMaize,
    province: "Huambo",
    municipality: "Caála",
    featured: true,
    sections: maizeSections,
  }),
  course({
    id: "demo-course-pecuaria",
    slug: "demo-curso-sanidade-bovina",
    title: "Sanidade bovina na fazenda",
    shortDescription: "Vacinação, maneio e registos para um rebanho pequeno.",
    description:
      "Formação curta com a Clínica Veterinária do Campo. Mostra como organizar o calendário sanitário e o que observar antes de chamar o veterinário.",
    providerId: "demo-provider-malanje",
    category: "Pecuária",
    categorySlug: "pecuaria",
    level: "intermediate",
    price: 22000,
    hours: 3,
    thumbnail: DEMO_MEDIA.courseCattle,
    province: "Malanje",
    municipality: "Cacuso",
    featured: true,
    sections: cattleSections,
  }),
  course({
    id: "demo-course-rega",
    slug: "demo-curso-rega-na-estacao-seca",
    title: "Rega na estação seca",
    shortDescription: "Montar e operar um setor de rega sem desperdiçar água.",
    description:
      "Curso da Oficina Agrícola do Lobito para hortas e parcelas de meio hectare. Explica a escolha do sistema, a pressão e o calendário de rega.",
    providerId: "demo-provider-benguela",
    category: "Irrigação",
    categorySlug: "irrigacao",
    level: "beginner",
    price: 18000,
    hours: 3,
    thumbnail: DEMO_MEDIA.courseWater,
    province: "Benguela",
    municipality: "Lobito",
    sections: waterSections,
  }),
];

export const DEMO_COURSE_LIST: Array<CourseListItem & { isDemo: true }> = DEMO_COURSES.map(
  (item) => item.list
);
