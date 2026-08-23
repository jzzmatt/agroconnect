import type { AcademyVideoStatus as DbAcademyVideoStatus } from "./database";

export type AcademyVideoVisibility = "private" | "unlisted" | "public" | "enrolled_only";

export interface AcademyVideoDescriptor {
  id: string;
  owner_id: string;
  course_id?: string | null;
  chapter_id?: string | null;
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
  description?: string | null;
  level: "beginner" | "intermediate" | "advanced" | "all_levels";
  price: number;
  currency: string;
  thumbnail_url?: string | null;
  category?: string;
  duration_hours?: number;
  students_count?: number;
  rating?: number;
  status: "draft" | "published" | "archived";
  created_at: string;
}
