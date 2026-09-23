import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/clerk/auth";
import { CourseAccessService } from "@/lib/academy/course-access";
import { isAllowedYouTubeEmbedUrl } from "@/lib/academy/youtube";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ lessonId: string }> }
) {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return NextResponse.json({ allowed: false, code: "AUTH_REQUIRED" }, { status: 401 });
  }

  const { lessonId } = await context.params;
  const result = await CourseAccessService.getLessonPlayback({
    lessonId,
    profileId: profile.id,
  });

  if (!result.allowed) {
    return NextResponse.json(
      { allowed: false, code: result.reason || "ACCESS_DENIED" },
      { status: 403 }
    );
  }

  if (result.source === "upload" && result.playbackUrl) {
    return NextResponse.json({
      allowed: true,
      source: "upload",
      playbackUrl: result.playbackUrl,
      mimeType: result.mimeType,
      expiresAt: result.expiresAt,
    });
  }

  if (result.source === "youtube" && isAllowedYouTubeEmbedUrl(result.embedUrl)) {
    return NextResponse.json({ allowed: true, source: "youtube", embedUrl: result.embedUrl });
  }

  return NextResponse.json({ allowed: false, code: "INVALID_PLAYBACK" }, { status: 403 });
}
