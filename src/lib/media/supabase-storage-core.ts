import "server-only";

import { randomUUID } from "crypto";
import { tryGetMediaSupabaseClient } from "@/lib/media/db";
import { tryCreateAdminServerSupabaseClient } from "@/lib/supabase/server";
import { DISPLAY_SIGNED_URL_TTL_SECONDS } from "@/lib/media/supabase-buckets";

function getStorageAdminClient() {
  return tryGetMediaSupabaseClient() || tryCreateAdminServerSupabaseClient();
}

export function safeStorageFileName(extension: string): string {
  const safeExt = extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `${randomUUID()}.${safeExt}`;
}

export async function createSignedUploadUrl(bucket: string, storagePath: string) {
  const supabase = getStorageAdminClient();
  if (!supabase) throw new Error("STORAGE_UNAVAILABLE");

  const { data, error } = await supabase.storage
    .from(bucket)
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

export async function createSignedDisplayUrl(bucket: string, storagePath: string) {
  const supabase = getStorageAdminClient();
  if (!supabase) throw new Error("STORAGE_UNAVAILABLE");

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, DISPLAY_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "SIGNED_DISPLAY_FAILED");
  }

  const expiresAt = new Date(Date.now() + DISPLAY_SIGNED_URL_TTL_SECONDS * 1000).toISOString();
  return { signedUrl: data.signedUrl, expiresAt };
}

export async function uploadBufferToStorage(params: {
  bucket: string;
  storagePath: string;
  buffer: Buffer;
  contentType: string;
}) {
  const supabase = getStorageAdminClient();
  if (!supabase) throw new Error("STORAGE_UNAVAILABLE");

  const { error } = await supabase.storage.from(params.bucket).upload(params.storagePath, params.buffer, {
    contentType: params.contentType,
    upsert: true,
  });
  if (error) throw new Error(error.message || "STORAGE_UPLOAD_FAILED");
}

export async function removeStorageObject(bucket: string, storagePath: string | null | undefined) {
  if (!storagePath) return;
  const supabase = getStorageAdminClient();
  if (!supabase) return;
  await supabase.storage.from(bucket).remove([storagePath]);
}

export async function storageObjectExists(bucket: string, storagePath: string): Promise<boolean> {
  const supabase = getStorageAdminClient();
  if (!supabase) return false;

  const folder = storagePath.split("/").slice(0, -1).join("/");
  const fileName = storagePath.split("/").pop();
  if (!folder || !fileName) return false;

  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    search: fileName,
    limit: 1,
  });

  if (error) return false;
  return Boolean(data?.some((item) => item.name === fileName));
}

export async function resolveSignedDisplayUrl(
  bucket: string,
  storagePath: string | null | undefined,
  legacyUrl: string | null | undefined
): Promise<string | null> {
  if (storagePath?.trim()) {
    try {
      const { signedUrl } = await createSignedDisplayUrl(bucket, storagePath.trim());
      return signedUrl;
    } catch {
      return legacyUrl ?? null;
    }
  }
  return legacyUrl ?? null;
}
