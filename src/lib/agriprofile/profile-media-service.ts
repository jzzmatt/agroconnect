import { getMediaSupabaseClient } from "@/lib/media/db";
import {
  deleteImageKitFile,
  optimizedProfileImageUrl,
  profileMediaFolder,
  uploadBufferToImageKit,
} from "@/lib/media/imagekit";
import { PublicProviderIdentityService } from "./provider-identity-service";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateProfileImage(params: {
  mimeType: string;
  fileSize: number;
  fileName?: string;
}): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_TYPES.has(params.mimeType)) {
    return { ok: false, error: "Formato inválido. Utilize JPEG, PNG ou WebP." };
  }
  if (params.fileSize <= 0 || params.fileSize > MAX_IMAGE_BYTES) {
    return { ok: false, error: "A imagem deve ter no máximo 5 MB." };
  }
  const ext = (params.fileName || "").toLowerCase();
  if (ext && !/\.(jpe?g|png|webp)$/.test(ext)) {
    return { ok: false, error: "Extensão de ficheiro inválida." };
  }
  return { ok: true };
}

export class ProfileMediaService {
  public static optimizedUrl(url: string | null | undefined): string | null {
    return optimizedProfileImageUrl(url);
  }

  public static async replace(params: {
    profileId: string;
    buffer: Buffer;
    fileName: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
    fileSize: number;
  }): Promise<{ url: string; thumbnailUrl: string | null }> {
    const uploaded = await uploadBufferToImageKit({
      buffer: params.buffer,
      fileName: params.fileName,
      folder: profileMediaFolder(params.profileId),
    });
    if (!uploaded.configured || !uploaded.url) {
      throw Object.assign(new Error(uploaded.error || "Não foi possível carregar a imagem."), {
        code: uploaded.code || "IMAGEKIT_UPLOAD_FAILED",
      });
    }

    const supabase = getMediaSupabaseClient();
    const { data: existing } = await (supabase.from("media_assets") as any)
      .select("*")
      .eq("owner_profile_id", params.profileId)
      .eq("entity_type", "profile_avatar")
      .order("created_at", { ascending: false });

    for (const row of existing || []) {
      const fileId = (row.metadata as { imagekitFileId?: string } | null)?.imagekitFileId;
      if (fileId) {
        void deleteImageKitFile(fileId).catch(() => undefined);
      }
      await supabase.from("media_assets").delete().eq("id", row.id);
    }

    const { error } = await (supabase.from("media_assets") as any).insert({
      owner_profile_id: params.profileId,
      entity_type: "profile_avatar",
      entity_id: params.profileId,
      storage_provider: "imagekit",
      storage_key: uploaded.filePath || params.fileName,
      url: uploaded.url,
      mime_type: params.mimeType,
      file_size: uploaded.fileSize ?? params.fileSize,
      metadata: {
        imagekitFileId: uploaded.fileId,
        thumbnailUrl: uploaded.thumbnailUrl,
      },
    });
    if (error) {
      void deleteImageKitFile(uploaded.fileId || "").catch(() => undefined);
      throw Object.assign(new Error(error.message), { code: "PROFILE_IMAGE_PERSIST_FAILED" });
    }

    await (supabase.from("profiles") as any)
      .update({
        avatar_url: uploaded.url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.profileId);

    await PublicProviderIdentityService.syncAvatarUrl(params.profileId, uploaded.url);

    return {
      url: uploaded.url,
      thumbnailUrl: uploaded.thumbnailUrl,
    };
  }

  public static async remove(profileId: string): Promise<void> {
    const supabase = getMediaSupabaseClient();
    const { data: existing } = await (supabase.from("media_assets") as any)
      .select("*")
      .eq("owner_profile_id", profileId)
      .eq("entity_type", "profile_avatar");

    for (const row of existing || []) {
      const fileId = (row.metadata as { imagekitFileId?: string } | null)?.imagekitFileId;
      if (fileId) {
        void deleteImageKitFile(fileId).catch(() => undefined);
      }
      await supabase.from("media_assets").delete().eq("id", row.id);
    }

    await (supabase.from("profiles") as any)
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq("id", profileId);
    await PublicProviderIdentityService.syncAvatarUrl(profileId, null);
  }
}
