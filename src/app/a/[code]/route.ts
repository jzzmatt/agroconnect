import { NextResponse } from "next/server";
import { isYouTubeVideoId } from "@/lib/academy/youtube";
import { lessonHasPlayableVideo } from "@/lib/academy/lesson-video";
import { createLessonVideoSignedPlaybackUrl } from "@/lib/academy/lesson-video-storage";
import { getAcademyWritableClient } from "@/lib/academy/supabase-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE = /^[a-z2-9]{8}$/;

/** Short WhatsApp demo link. The signed file URL is created only when someone opens it. */
export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const origin = new URL(request.url).origin;
  const home = new URL("/agriacademy", origin);
  const { code } = await context.params;
  if (!CODE.test(code)) return NextResponse.redirect(home);

  const supabase = await getAcademyWritableClient();
  const { data: lesson } = await (supabase.from("course_lessons") as any)
    .select("course_id, youtube_video_id, video_source, upload_storage_path, upload_status, demo_campaign")
    .eq("demo_share_code", code)
    .eq("demo_campaign", true)
    .maybeSingle();
  if (!lesson?.demo_campaign) return NextResponse.redirect(home);

  const { data: course } = await (supabase.from("courses") as any)
    .select("slug, status")
    .eq("id", lesson.course_id)
    .maybeSingle();
  if (!course || course.status !== "published") return NextResponse.redirect(home);

  const coursePage = course.slug
    ? new URL(`/agriacademy/courses/${encodeURIComponent(String(course.slug))}`, origin)
    : home;

  if (!lessonHasPlayableVideo(lesson)) return NextResponse.redirect(coursePage);

  if ((lesson.video_source ?? "youtube") !== "upload" && isYouTubeVideoId(lesson.youtube_video_id)) {
    return NextResponse.redirect(`https://youtu.be/${lesson.youtube_video_id}`);
  }

  if (lesson.video_source === "upload" && lesson.upload_storage_path) {
    try {
      const signed = await createLessonVideoSignedPlaybackUrl(String(lesson.upload_storage_path));
      return NextResponse.redirect(signed.signedUrl);
    } catch {
      return NextResponse.redirect(coursePage);
    }
  }

  return NextResponse.redirect(coursePage);
}
