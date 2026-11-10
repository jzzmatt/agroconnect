import "server-only";

import { NextResponse } from "next/server";
import { AuthorizationError, authorizationStatus, requirePermission } from "@/lib/authorization";
import { getCurrentSubject } from "@/lib/authorization/server";
import { getCurrentUserProfile } from "@/lib/clerk/auth";

export async function requireServiceThumbnailOwner(): Promise<
  { profileId: string } | { response: NextResponse }
> {
  const subject = await getCurrentSubject();
  if (!subject) return { response: NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 }) };
  try {
    requirePermission(subject, "service.manage");
  } catch (error) {
    const status = authorizationStatus(error);
    if (status) {
      const code = error instanceof AuthorizationError ? error.code : "PERMISSION_DENIED";
      return { response: NextResponse.json({ error: code }, { status }) };
    }
    throw error;
  }
  return { profileId: subject.profileId };
}

export async function currentViewerProfileId(): Promise<string | null> {
  const profile = await getCurrentUserProfile();
  return profile?.id ?? null;
}

export function thumbnailErrorResponse(error: unknown): NextResponse {
  const code = error && typeof error === "object" && "code" in error && typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : "THUMBNAIL_GENERATION_FAILED";
  const status = code === "AUTH_REQUIRED"
    ? 401
    : code === "NOT_FOUND" || code === "PREVIEW_NOT_FOUND"
      ? 404
      : code === "INVALID_REQUEST"
        ? 400
        : code === "OPENAI_NOT_CONFIGURED" || code === "STORAGE_UNAVAILABLE"
          ? 503
          : 500;
  console.error("[service thumbnail] request failed", code);
  return NextResponse.json({ error: code }, { status });
}
