import type {
  AcademyVideoStatus as DbAcademyVideoStatus,
  CourseEnrollmentStatus,
  CourseLevel,
  CourseStatus,
} from "./database";

/** @deprecated Academy training video is a YouTube Unlisted ID on the lesson. */
export type AcademyVideoVisibility = "private" | "unlisted" | "public" | "enrolled_only";

/** @deprecated Kept for leftover `academy_videos` rows; new lessons use `youtube_video_id`. */
export interface AcademyVideoDescriptor {
  id: string;
  owner_id: string;
  bunny_video_id?: string | null;
  bunny_library_id?: string | null;
  title: string;
  description?: string | null;
  filename?: string | null;
  mime_type?: string | null;
  file_size: number;
  duration_seconds?: number | null;
  status: DbAcademyVideoStatus;
  visibility: AcademyVideoVisibility;
  thumbnail_url?: string | null;
  playback_url?: string | null;
  reference_count?: number;
  orphaned_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type { CourseStatus, CourseLevel, CourseEnrollmentStatus };

export interface CourseRecord {
  id: string;
  owner_id: string;
  provider_id?: string | null;
  category_id?: string | null;
  title: string;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  level: CourseLevel;
  price: number;
  currency: string;
  status: CourseStatus;
  thumbnail_url?: string | null;
  duration_hours?: number | null;
  lessons_count: number;
  students_count: number;
  rating?: number | null;
  province_id?: string | null;
  municipality_id?: string | null;
  province_name?: string | null;
  municipality_name?: string | null;
  is_featured: boolean;
  published_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  instructor_id: string;
  instructor_name: string;
  instructor_avatar_url?: string | null;
  instructor_role?: string | null;
  provider_id?: string | null;
  provider_slug?: string | null;
  description?: string | null;
  short_description?: string | null;
  level: CourseLevel;
  price: number;
  currency: string;
  thumbnail_url?: string | null;
  category?: string | null;
  category_slug?: string | null;
  duration_hours?: number | null;
  lessons_count?: number;
  students_count?: number;
  rating?: number | null;
  province_name?: string | null;
  municipality_name?: string | null;
  status: CourseStatus;
  is_featured?: boolean;
  created_at: string;
  published_at?: string | null;
}

export interface CourseSectionRecord {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CourseLessonRecord {
  id: string;
  course_id: string;
  section_id: string;
  title: string;
  description?: string | null;
  sort_order: number;
  academy_video_id?: string | null;
  youtube_video_id?: string | null;
  youtube_source_url?: string | null;
  duration_seconds?: number | null;
  is_free_preview: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollmentRecord {
  id: string;
  course_id: string;
  student_id: string;
  status: CourseEnrollmentStatus;
  enrolled_at: string;
  completed_at?: string | null;
  last_lesson_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollmentStudentRow {
  enrollmentId: string;
  courseId: string;
  studentId: string;
  studentEmail: string | null;
  studentDisplayName: string | null;
  enrolledAt: string;
  status: CourseEnrollmentStatus;
}

export interface EnrolledCourseListItem {
  enrollmentId: string;
  enrolledAt: string;
  lastLessonId?: string | null;
  course: CourseListItem;
}

export interface CourseWithSections extends CourseRecord {
  sections: Array<CourseSectionRecord & { lessons: CourseLessonRecord[] }>;
}

export type LessonWithVideo = CourseLessonRecord;

export type SectionWithLessons = CourseSectionRecord & {
  lessons: LessonWithVideo[];
};

export type CourseEditorTree = CourseWithSections & {
  sections: SectionWithLessons[];
};

export interface CreateCourseInput {
  title: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  level?: CourseLevel;
  price?: number;
  currency?: string;
  categoryId?: string;
  provinceName?: string;
  municipalityName?: string;
  thumbnailUrl?: string;
  providerId?: string;
}

export interface UpdateCourseInput extends Partial<CreateCourseInput> {
  id: string;
  status?: CourseStatus;
}

export interface SearchCoursesFilterParams {
  query?: string;
  categorySlug?: string;
  provinceName?: string;
  level?: CourseLevel;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}
