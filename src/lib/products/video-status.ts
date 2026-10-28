import { visibleMediaUrl } from "@/lib/media/retired-media-url";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

type VideoRow = {
  id: string;
  product_id: string;
  status: string;
  playback_url: string | null;
};

/**
 * Reads the stored product video status. Upload completion is recorded by
 * the storage confirm route, so this does not call an external media API.
 */
export async function reconcileProductVideoStatus(
  productId: string
): Promise<{ status: string; playbackUrl: string | null } | null> {
  const supabase = tryCreateAdminSupabaseClient();
  if (!supabase || !productId) return null;

  const { data } = await (supabase.from("product_videos") as any)
    .select("id,product_id,status,playback_url")
    .eq("product_id", productId)
    .neq("status", "deleted")
    .maybeSingle();

  const row = data as VideoRow | null;
  if (!row) return null;
  return { status: row.status, playbackUrl: visibleMediaUrl(row.playback_url) };
}
