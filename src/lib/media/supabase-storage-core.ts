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

export async function downloadStorageObject(bucket: string, storagePath: string): Promise<Buffer | null> {
  const supabase = getStorageAdminClient();
  if (!supabase) throw new Error("STORAGE_UNAVAILABLE");
  const downloaded = await supabase.storage.from(bucket).download(storagePath);
  if (downloaded.error || !downloaded.data) return null;
  const data = downloaded.data as Blob | ArrayBuffer | Buffer;
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (typeof data.arrayBuffer === "function") return Buffer.from(await data.arrayBuffer());
  throw Object.assign(new Error("TEMP_VIDEO_FAILED"), { code: "TEMP_VIDEO_FAILED" });
}

export async function copyStorageObject(params: {
  sourceBucket: string;
  sourcePath: string;
  targetBucket: string;
  targetPath: string;
  contentType: string;
}) {
  const supabase = getStorageAdminClient();
  if (!supabase) throw new Error("STORAGE_UNAVAILABLE");
  const downloaded = await supabase.storage.from(params.sourceBucket).download(params.sourcePath);
  if (downloaded.error || !downloaded.data) {
    throw new Error(downloaded.error?.message || "TEMP_VIDEO_MISSING");
  }
  const buffer = Buffer.from(await downloaded.data.arrayBuffer());
  await uploadBufferToStorage({
    bucket: params.targetBucket,
    storagePath: params.targetPath,
    buffer,
    contentType: params.contentType,
  });
}

export async function removeStorageObject(bucket: string, storagePath: string | null | undefined) {
  if (!storagePath) return;
  const supabase = getStorageAdminClient();
  if (!supabase) return;
  await supabase.storage.from(bucket).remove([storagePath]);
}

export async function storageObjectSize(bucket: string, storagePath: string): Promise<number | null> {
  const supabase = getStorageAdminClient();
  if (!supabase || !storagePath || storagePath.includes("..")) return null;
  const slash = storagePath.lastIndexOf("/");
  const folder = slash >= 0 ? storagePath.slice(0, slash) : "";
  const name = slash >= 0 ? storagePath.slice(slash + 1) : storagePath;
  const listed = await supabase.storage.from(bucket).list(folder, { search: name, limit: 20 });
  if (listed.error || !listed.data) return null;
  const match = listed.data.find((entry) => entry.name === name);
  const size = match?.metadata && typeof match.metadata === "object" ? Number((match.metadata as { size?: unknown }).size) : NaN;
  return Number.isFinite(size) && size > 0 ? size : null;
}

export async function storageObjectExists(bucket: string, storagePath: string): Promise<boolean> {
  const supabase = getStorageAdminClient();
  if (!supabase || !storagePath) return false;

  const signed = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60);
  return Boolean(signed.data?.signedUrl);
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
