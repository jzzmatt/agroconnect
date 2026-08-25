import { NextResponse } from "next/server";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { isUuid } from "@/lib/products/ids";
import { invalidateCachedUserProfile } from "@/lib/auth/profile-cache";
import { ProfileMediaService, validateProfileImage } from "@/lib/agriprofile/profile-media-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile || !isUuid(profile.id)) {
      return NextResponse.json({ success: false, error: "AUTH_REQUIRED", code: "AUTH_REQUIRED" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "PROFILE_IMAGE_FAILED", code: "PROFILE_IMAGE_FAILED" }, { status: 400 });
    }

    const mimeType = file.type === "image/png" || file.type === "image/webp" ? file.type : "image/jpeg";
    const validation = validateProfileImage({
      mimeType,
      fileSize: file.size,
      fileName: file.name,
    });
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, error: "PROFILE_IMAGE_FAILED", code: "PROFILE_IMAGE_FAILED", message: validation.error },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const image = await ProfileMediaService.replace({
      profileId: profile.id,
      buffer: bytes,
      fileName: file.name || "profile-avatar.jpg",
      mimeType,
      fileSize: file.size,
    });
    invalidateCachedUserProfile(profile.clerk_user_id);

    return NextResponse.json({
      success: true,
      url: ProfileMediaService.optimizedUrl(image.url) || image.url,
      thumbnailUrl: image.thumbnailUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "PROFILE_IMAGE_FAILED";
    if (/autorizado|unauthor|sign in|AUTH_REQUIRED/i.test(message)) {
      return NextResponse.json({ success: false, error: "AUTH_REQUIRED", code: "AUTH_REQUIRED" }, { status: 401 });
    }
    const code = (error as { code?: string })?.code || "PROFILE_IMAGE_FAILED";
    return NextResponse.json({ success: false, error: code, code, message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile || !isUuid(profile.id)) {
      return NextResponse.json({ success: false, error: "AUTH_REQUIRED", code: "AUTH_REQUIRED" }, { status: 401 });
    }
    await ProfileMediaService.remove(profile.id);
    invalidateCachedUserProfile(profile.clerk_user_id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "PROFILE_IMAGE_FAILED";
    if (/autorizado|unauthor|sign in|AUTH_REQUIRED/i.test(message)) {
      return NextResponse.json({ success: false, error: "AUTH_REQUIRED", code: "AUTH_REQUIRED" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "PROFILE_IMAGE_FAILED", code: "PROFILE_IMAGE_FAILED", message }, { status: 500 });
  }
}
