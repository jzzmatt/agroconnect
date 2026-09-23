import { extensionFromFilename } from "@/lib/academy/course-thumbnail";

export function buildProfileAvatarStoragePath(params: {
  profileId: string;
  fileName: string;
}): string {
  const ext = extensionFromFilename(params.fileName) || "jpg";
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `${params.profileId}/avatar/avatar.${safeExt}`;
}
