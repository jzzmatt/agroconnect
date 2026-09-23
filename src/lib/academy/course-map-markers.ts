import "server-only";

import type { MapMarkerItem } from "@/components/location/LocationMap";
import { createPublicServerSupabaseClient } from "@/lib/supabase/client";
import { enrichCourseListItemsWithSignedThumbnails } from "@/lib/academy/course-thumbnail-service";
import { courseHasMapLocation } from "@/lib/academy/course-location";
import { isPubliclyVisibleCourseStatus } from "@/lib/academy/course-lifecycle";
import type { CourseStatus } from "@/types/database";

function hasLiveSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

export async function listPublishedCourseMapMarkers(): Promise<MapMarkerItem[]> {
  if (!hasLiveSupabase()) return [];

  const supabase = createPublicServerSupabaseClient();
  const { data, error } = await (supabase.from("courses") as any)
    .select(
      "id, slug, title, short_description, description, status, latitude, longitude, location_name, location_address, province_name, municipality_name, thumbnail_storage_path, thumbnail_url"
    )
    .eq("status", "published")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error || !data) return [];

  const rows = (data as Record<string, unknown>[]).filter((row) =>
    isPubliclyVisibleCourseStatus(row.status as CourseStatus)
  );

  const withThumbs = await enrichCourseListItemsWithSignedThumbnails(
    rows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      slug: String(row.slug),
      thumbnail_url: (row.thumbnail_url as string | null) ?? null,
      thumbnail_storage_path: (row.thumbnail_storage_path as string | null) ?? null,
    }))
  );

  const thumbById = new Map(withThumbs.map((item) => [item.id, item.thumbnail_url]));

  return rows
    .filter((row) =>
      courseHasMapLocation({
        latitude: row.latitude != null ? Number(row.latitude) : null,
        longitude: row.longitude != null ? Number(row.longitude) : null,
      })
    )
    .map((row) => {
      const id = String(row.id);
      const locationLabel =
        (row.location_name as string | null) ||
        (row.location_address as string | null) ||
        (row.municipality_name as string | null) ||
        (row.province_name as string | null) ||
        "Angola";

      return {
        id: `course-${id}`,
        title: String(row.title),
        category: "academy" as const,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        provinceName: (row.province_name as string | null) || locationLabel,
        municipalityName: (row.municipality_name as string | null) || undefined,
        description:
          (row.short_description as string | null) ||
          (row.description as string | null)?.slice(0, 160) ||
          undefined,
        thumbnailUrl: thumbById.get(id) || undefined,
        href: `/agriacademy/${String(row.slug)}`,
      };
    });
}
