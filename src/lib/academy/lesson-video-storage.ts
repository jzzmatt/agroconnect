import "server-only";

import { tryGetMediaSupabaseClient } from "@/lib/media/db";
import { tryCreateAdminServerSupabaseClient } from "@/lib/supabase/server";
import { ACADEMY_VIDEOS_BUCKET } from "@/lib/academy/lesson-video";

const PLAYBACK_SIGNED_URL_TTL_SECONDS = 60 * 60;

function getStorageAdminClient() {
  return tryGetMediaSupabaseClient() || tryCreateAdminServerSupabaseClient();
}

export async function createLessonVideoSignedUploadUrl(storagePath: string) {
  const supabase = getStorageAdminClient();
  if (!supabase) {
    throw new Error("STORAGE_UNAVAILABLE");
  }

  const { data, error } = await supabase.storage
    .from(ACADEMY_VIDEOS_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: true });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "SIGNED_UPLOAD_FAILED");
  }

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path || storagePath,
  };
}

export async function createLessonVideoSignedPlaybackUrl(storagePath: string) {
  const supabase = getStorageAdminClient();
  if (!supabase) {
    throw new Error("STORAGE_UNAVAILABLE");
  }

  const { data, error } = await supabase.storage
    .from(ACADEMY_VIDEOS_BUCKET)
    .createSignedUrl(storagePath, PLAYBACK_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "SIGNED_PLAYBACK_FAILED");
  }

  const expiresAt = new Date(Date.now() + PLAYBACK_SIGNED_URL_TTL_SECONDS * 1000).toISOString();
  return { signedUrl: data.signedUrl, expiresAt };
}

export async function removeLessonVideoObject(storagePath: string | null | undefined) {
  if (!storagePath) return;
  const supabase = getStorageAdminClient();
  if (!supabase) return;

  await supabase.storage.from(ACADEMY_VIDEOS_BUCKET).remove([storagePath]);
}

export async function lessonVideoObjectExists(storagePath: string): Promise<boolean> {
  const supabase = getStorageAdminClient();
  if (!supabase) return false;

  const folder = storagePath.split("/").slice(0, -1).join("/");
  const fileName = storagePath.split("/").pop();
  if (!folder || !fileName) return false;

  const { data, error } = await supabase.storage.from(ACADEMY_VIDEOS_BUCKET).list(folder, {
    search: fileName,
    limit: 1,
  });

  if (error) return false;
  return Boolean(data?.some((item) => item.name === fileName));
}
