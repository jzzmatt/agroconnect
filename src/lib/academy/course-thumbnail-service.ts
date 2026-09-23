import "server-only";

import { getAcademyWritableClient } from "@/lib/academy/supabase-client";
import { CoursePersistenceError, COURSE_MUTATION_MESSAGES } from "@/lib/academy/course-errors";
import {
  buildCourseThumbnailStoragePath,
  validateCourseThumbnailFileMeta,
} from "@/lib/academy/course-thumbnail";
import {
  courseThumbnailObjectExists,
  createCourseThumbnailSignedDisplayUrl,
  createCourseThumbnailSignedUploadUrl,
  removeCourseThumbnailObject,
} from "@/lib/academy/course-thumbnail-storage";
import type { CourseRecord } from "@/types/agriacademy";

const COURSES_TABLE = "courses";

function hasLiveSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

function normalizeCourse(row: Record<string, unknown>): CourseRecord {
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
    thumbnail_storage_path: (row.thumbnail_storage_path as string | null) ?? null,
    thumbnail_original_filename: (row.thumbnail_original_filename as string | null) ?? null,
    thumbnail_mime_type: (row.thumbnail_mime_type as string | null) ?? null,
    thumbnail_size: row.thumbnail_size != null ? Number(row.thumbnail_size) : null,
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

export class AcademyCourseThumbnailService {
  public static async prepareUpload(params: {
    ownerId: string;
    courseId: string;
    fileName: string;
    fileSize: number;
    mimeType?: string | null;
  }) {
    const validation = validateCourseThumbnailFileMeta({
      fileName: params.fileName,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
    });
    if (!validation.ok) {
      throw new CoursePersistenceError(validation.code, COURSE_MUTATION_MESSAGES[validation.code]);
    }

    if (!hasLiveSupabase()) {
      throw new CoursePersistenceError("DATABASE_ERROR", COURSE_MUTATION_MESSAGES.DATABASE_ERROR);
    }

    const storagePath = buildCourseThumbnailStoragePath({
      ownerId: params.ownerId,
      courseId: params.courseId,
      extension: validation.extension,
    });

    const signed = await createCourseThumbnailSignedUploadUrl(storagePath);

    return {
      storagePath,
      signedUrl: signed.signedUrl,
      token: signed.token,
      mimeType: validation.mimeType,
    };
  }

  public static async completeUpload(params: {
    ownerId: string;
    courseId: string;
    storagePath: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    replace?: boolean;
  }) {
    const validation = validateCourseThumbnailFileMeta({
      fileName: params.fileName,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
    });
    if (!validation.ok) {
      await removeCourseThumbnailObject(params.storagePath);
      throw new CoursePersistenceError(validation.code, COURSE_MUTATION_MESSAGES[validation.code]);
    }

    const expectedPrefix = `${params.ownerId}/${params.courseId}/`;
    if (!params.storagePath.startsWith(expectedPrefix)) {
      await removeCourseThumbnailObject(params.storagePath);
      throw new CoursePersistenceError("UNAUTHORIZED", COURSE_MUTATION_MESSAGES.UNAUTHORIZED);
    }

    if (!hasLiveSupabase()) {
      throw new CoursePersistenceError("DATABASE_ERROR", COURSE_MUTATION_MESSAGES.DATABASE_ERROR);
    }

    const supabase = await getAcademyWritableClient();
    const { data: existing, error: readError } = await (supabase.from(COURSES_TABLE) as any)
      .select(
        "id, owner_id, thumbnail_storage_path, thumbnail_url, thumbnail_original_filename, thumbnail_mime_type, thumbnail_size"
      )
      .eq("id", params.courseId)
      .eq("owner_id", params.ownerId)
      .maybeSingle();

    if (readError || !existing) {
      await removeCourseThumbnailObject(params.storagePath);
      throw new CoursePersistenceError("UNAUTHORIZED", COURSE_MUTATION_MESSAGES.UNAUTHORIZED);
    }

    const exists = await courseThumbnailObjectExists(params.storagePath);
    if (!exists) {
      throw new CoursePersistenceError("DATABASE_ERROR", COURSE_MUTATION_MESSAGES.DATABASE_ERROR);
    }

    const previousPath = existing.thumbnail_storage_path as string | null;

    const { data, error } = await (supabase.from(COURSES_TABLE) as any)
      .update({
        thumbnail_storage_path: params.storagePath,
        thumbnail_original_filename: params.fileName,
        thumbnail_mime_type: validation.mimeType,
        thumbnail_size: params.fileSize,
        thumbnail_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.courseId)
      .eq("owner_id", params.ownerId)
      .select()
      .single();

    if (error || !data) {
      await removeCourseThumbnailObject(params.storagePath);
      throw new CoursePersistenceError("DATABASE_ERROR", COURSE_MUTATION_MESSAGES.DATABASE_ERROR, error);
    }

    if (params.replace && previousPath && previousPath !== params.storagePath) {
      await removeCourseThumbnailObject(previousPath);
    }

    return normalizeCourse(data as Record<string, unknown>);
  }

  public static async removeThumbnail(params: { ownerId: string; courseId: string }) {
    if (!hasLiveSupabase()) {
      throw new CoursePersistenceError("DATABASE_ERROR", COURSE_MUTATION_MESSAGES.DATABASE_ERROR);
    }

    const supabase = await getAcademyWritableClient();
    const { data: existing, error: readError } = await (supabase.from(COURSES_TABLE) as any)
      .select("id, owner_id, thumbnail_storage_path")
      .eq("id", params.courseId)
      .eq("owner_id", params.ownerId)
      .maybeSingle();

    if (readError || !existing) {
      throw new CoursePersistenceError("UNAUTHORIZED", COURSE_MUTATION_MESSAGES.UNAUTHORIZED);
    }

    const previousPath = existing.thumbnail_storage_path as string | null;

    const { data, error } = await (supabase.from(COURSES_TABLE) as any)
      .update({
        thumbnail_storage_path: null,
        thumbnail_original_filename: null,
        thumbnail_mime_type: null,
        thumbnail_size: null,
        thumbnail_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.courseId)
      .eq("owner_id", params.ownerId)
      .select()
      .single();

    if (error || !data) {
      throw new CoursePersistenceError("DATABASE_ERROR", COURSE_MUTATION_MESSAGES.DATABASE_ERROR, error);
    }

    if (previousPath) {
      await removeCourseThumbnailObject(previousPath);
    }

    return normalizeCourse(data as Record<string, unknown>);
  }

  public static async getOwnerDisplayUrl(params: { ownerId: string; courseId: string }) {
    if (!hasLiveSupabase()) return null;

    const supabase = await getAcademyWritableClient();
    const { data } = await (supabase.from(COURSES_TABLE) as any)
      .select("thumbnail_storage_path, thumbnail_url, owner_id")
      .eq("id", params.courseId)
      .eq("owner_id", params.ownerId)
      .maybeSingle();

    if (!data?.thumbnail_storage_path) {
      return data?.thumbnail_url ? { signedUrl: String(data.thumbnail_url), expiresAt: null } : null;
    }

    return createCourseThumbnailSignedDisplayUrl(String(data.thumbnail_storage_path));
  }

  public static async resolveDisplayUrlForStoragePath(storagePath: string) {
    return createCourseThumbnailSignedDisplayUrl(storagePath);
  }
}

export async function enrichCourseListItemsWithSignedThumbnails<T extends { thumbnail_storage_path?: string | null; thumbnail_url?: string | null }>(
  items: T[]
): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => {
      const path = item.thumbnail_storage_path?.trim();
      if (!path) return item;
      try {
        const signed = await createCourseThumbnailSignedDisplayUrl(path);
        return { ...item, thumbnail_url: signed.signedUrl };
      } catch {
        return item;
      }
    })
  );
}
