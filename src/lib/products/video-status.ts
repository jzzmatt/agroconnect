import { fetchBunnyVideoStatus } from "@/lib/video/bunny";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";

type VideoRow = {
  id: string;
  product_id: string;
  status: string;
  bunny_video_id: string | null;
  playback_url: string | null;
};

const PENDING = new Set(["pending", "uploading", "processing"]);

/**
 * Brings a product's video row up to date with Bunny.
 *
 * `/api/webhooks/bunny` cannot reach a local dev server, and a single missed
 * delivery would strand a row at "uploading" so the player never appears.
 * Asking Bunny directly makes the state self-correcting.
 *
 * Returns the effective status, or null when there is nothing to reconcile.
 */
export async function reconcileProductVideoStatus(
  productId: string
): Promise<{ status: string; playbackUrl: string | null } | null> {
  const supabase = tryCreateAdminSupabaseClient();
  if (!supabase || !productId) return null;

  const { data } = await (supabase.from("product_videos") as any)
    .select("id,product_id,status,bunny_video_id,playback_url")
    .eq("product_id", productId)
    .neq("status", "deleted")
    .maybeSingle();

  const row = data as VideoRow | null;
  if (!row) return null;
  if (!PENDING.has(row.status) || !row.bunny_video_id) {
    return { status: row.status, playbackUrl: row.playback_url };
  }

  const remote = await fetchBunnyVideoStatus(row.bunny_video_id);
  if (!remote || remote.status === row.status) {
    return { status: row.status, playbackUrl: row.playback_url };
  }

  await (supabase.from("product_videos") as any)
    .update({
      status: remote.status,
      thumbnail_url: remote.thumbnailUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  return { status: remote.status, playbackUrl: row.playback_url };
}
