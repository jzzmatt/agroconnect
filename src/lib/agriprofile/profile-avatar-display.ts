import "server-only";

import { optimizedProfileImageUrl } from "@/lib/media/imagekit";
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
      return profile.avatar_url ?? null;
    }
  }
  return profile.avatar_url ? optimizedProfileImageUrl(profile.avatar_url) : null;
}
