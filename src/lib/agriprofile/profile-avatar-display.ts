import "server-only";

import { isRetiredMediaUrl } from "@/lib/media/retired-media-url";
import { PROFILE_MEDIA_BUCKET } from "@/lib/media/supabase-buckets";
import { createSignedDisplayUrl } from "@/lib/media/supabase-storage-core";

export async function resolveProfileAvatarDisplayUrl(profile: {
  avatar_url?: string | null;
  avatar_storage_path?: string | null;
}): Promise<string | null> {
  if (profile.avatar_storage_path?.trim()) {
    try {
      const { signedUrl } = await createSignedDisplayUrl(
        PROFILE_MEDIA_BUCKET,
        profile.avatar_storage_path.trim()
      );
      return signedUrl;
    } catch {
      return profile.avatar_url && !isRetiredMediaUrl(profile.avatar_url) ? profile.avatar_url : null;
    }
  }
  if (!profile.avatar_url || isRetiredMediaUrl(profile.avatar_url)) return null;
  return profile.avatar_url;
}
