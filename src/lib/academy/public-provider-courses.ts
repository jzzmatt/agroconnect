import { isPubliclyVisibleCourseStatus } from "@/lib/academy/course-lifecycle";
import type { CourseListItem } from "@/types/agriacademy";

const FORBIDDEN_PUBLIC_COURSE_KEYS = [
  "youtube_video_id",
  "youtube_source_url",
  "bunny_video_id",
  "bunny_library_id",
  "email",
  "student_email",
  "enrolled_at",
  "last_lesson_id",
  "owner_id",
] as const;

export function toPublicProviderAcademyCourses(courses: CourseListItem[]): CourseListItem[] {
  return courses
    .filter((course) => isPubliclyVisibleCourseStatus(course.status))
    .map((course) => ({
      id: course.id,
      title: course.title,
      slug: course.slug,
      instructor_id: course.instructor_id,
      instructor_name: course.instructor_name,
      instructor_avatar_url: course.instructor_avatar_url ?? null,
      instructor_role: course.instructor_role ?? null,
      provider_slug: course.provider_slug ?? null,
      description: course.description ?? null,
      short_description: course.short_description ?? null,
      level: course.level,
      price: course.price,
      currency: course.currency,
      thumbnail_url: course.thumbnail_url ?? null,
      category: course.category ?? null,
      category_slug: course.category_slug ?? null,
      duration_hours: course.duration_hours ?? null,
      lessons_count: course.lessons_count ?? 0,
      students_count: course.students_count ?? 0,
      rating: course.rating ?? null,
      province_name: course.province_name ?? null,
      municipality_name: course.municipality_name ?? null,
      status: "published",
      is_featured: course.is_featured ?? false,
      created_at: course.created_at,
      published_at: course.published_at ?? null,
    }));
}

export function collectForbiddenPublicCourseKeys(payload: unknown): string[] {
  const found = new Set<string>();

  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if ((FORBIDDEN_PUBLIC_COURSE_KEYS as readonly string[]).includes(key)) {
        found.add(key);
      }
      walk(nested);
    }
  };

  walk(payload);
  return [...found];
}
