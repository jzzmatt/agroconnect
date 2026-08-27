import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  analyzeYouTubeInput,
  buildYouTubeEmbedUrl,
  buildYouTubeThumbnailUrl,
  extractYouTubeVideoId,
  isYouTubeVideoId,
} from "@/lib/academy/youtube";
import { isMissingYoutubeColumnError, mutationRecordHasYouTubeId } from "@/lib/academy/db-errors";
import { buildAuthorizedEmbedUrl, canAccessLessonVideo } from "@/lib/academy/video-playback";
import { validateCourseForPublication } from "@/lib/academy/publication-validation";
import type { CourseWithSections } from "@/types/agriacademy";

const YT_ID = "dQw4w9WgXcQ";

function courseWithLesson(youtubeVideoId: string | null): CourseWithSections {
  return {
    id: "crs-yt",
    owner_id: "instructor-1",
    title: "Produção de Milho",
    slug: "producao-milho",
    description: "Curso completo",
    level: "beginner",
    price: 0,
    currency: "AOA",
    status: "draft",
    lessons_count: 1,
    students_count: 0,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sections: [
      {
        id: "sec-1",
        course_id: "crs-yt",
        title: "Introdução",
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lessons: [
          {
            id: "les-1",
            course_id: "crs-yt",
            section_id: "sec-1",
            title: "Apresentação",
            sort_order: 1,
            youtube_video_id: youtubeVideoId,
            is_free_preview: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      },
    ],
  };
}

describe("AGROCONNECT Phase 7 — YouTube AgriAcademy foundation", () => {
  it("extracts Video IDs from watch, share, embed and shorts URLs", () => {
    expect(extractYouTubeVideoId(YT_ID)).toBe(YT_ID);
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${YT_ID}`)).toBe(YT_ID);
    expect(extractYouTubeVideoId(`https://youtu.be/${YT_ID}`)).toBe(YT_ID);
    expect(extractYouTubeVideoId(`https://www.youtube.com/embed/${YT_ID}`)).toBe(YT_ID);
    expect(extractYouTubeVideoId(`https://www.youtube.com/shorts/${YT_ID}`)).toBe(YT_ID);
    expect(extractYouTubeVideoId(`youtube.com/watch?v=${YT_ID}&t=12s`)).toBe(YT_ID);
    expect(extractYouTubeVideoId("https://vimeo.com/123")).toBeNull();
    expect(extractYouTubeVideoId("not-a-youtube-url")).toBeNull();
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${YT_ID}&list=PLtest`)).toBe(YT_ID);
    expect(isYouTubeVideoId(YT_ID)).toBe(true);
  });

  it("rejects channels, playlists, malformed URLs and non-YouTube hosts", () => {
    expect(analyzeYouTubeInput("https://www.youtube.com/playlist?list=PLtest")).toEqual({
      ok: false,
      reason: "playlist",
    });
    expect(analyzeYouTubeInput("https://www.youtube.com/watch?list=PLtest")).toEqual({
      ok: false,
      reason: "playlist",
    });
    expect(analyzeYouTubeInput("https://www.youtube.com/@canal-agro")).toEqual({
      ok: false,
      reason: "channel",
    });
    expect(analyzeYouTubeInput("https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx")).toEqual({
      ok: false,
      reason: "channel",
    });
    expect(analyzeYouTubeInput("https://www.youtube.com/c/AgroConnect")).toEqual({
      ok: false,
      reason: "channel",
    });
    expect(analyzeYouTubeInput("https://www.youtube.com/user/agroconnect")).toEqual({
      ok: false,
      reason: "channel",
    });
    expect(analyzeYouTubeInput("https://vimeo.com/123")).toEqual({
      ok: false,
      reason: "not_youtube",
    });
    expect(analyzeYouTubeInput("not-a-youtube-url")).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(analyzeYouTubeInput(`https://www.youtube.com/watch?v=${YT_ID}`)).toEqual({
      ok: true,
      videoId: YT_ID,
      normalizedUrl: `https://www.youtube.com/watch?v=${YT_ID}`,
    });
    expect(buildYouTubeThumbnailUrl(YT_ID)).toBe(`https://i.ytimg.com/vi/${YT_ID}/hqdefault.jpg`);
  });

  it("builds a YouTube nocookie embed URL", () => {
    expect(buildYouTubeEmbedUrl(YT_ID)).toBe(`https://www.youtube-nocookie.com/embed/${YT_ID}`);
    expect(buildAuthorizedEmbedUrl(YT_ID)).toContain(YT_ID);
    expect(buildAuthorizedEmbedUrl(null)).toBeNull();
  });

  it("requires a YouTube Video ID on every lesson before publication", () => {
    expect(validateCourseForPublication(courseWithLesson(YT_ID)).ok).toBe(true);
    const missing = validateCourseForPublication(courseWithLesson(null));
    expect(missing.ok).toBe(false);
    expect(missing.issues.some((issue) => issue.code === "MISSING_YOUTUBE" && issue.lessonNumber === "01.01")).toBe(
      true
    );
    expect(missing.errors.some((error) => error.includes("01.01"))).toBe(true);
    expect(validateCourseForPublication(courseWithLesson("vid-bunny")).ok).toBe(false);
  });

  it("maps missing youtube_video_id schema errors", () => {
    expect(
      isMissingYoutubeColumnError({
        code: "PGRST204",
        message: "Could not find the 'youtube_video_id' column of 'course_lessons' in the schema cache",
      })
    ).toBe(true);
    expect(isMissingYoutubeColumnError({ code: "42703", message: 'column "youtube_video_id" does not exist' })).toBe(
      true
    );
    expect(isMissingYoutubeColumnError({ code: "23503", message: "fk violation" })).toBe(false);
  });

  it("reads YouTube IDs from nested mutation payloads", () => {
    expect(mutationRecordHasYouTubeId({ youtube_video_id: "dQw4w9WgXcQ" })).toBe(true);
    expect(mutationRecordHasYouTubeId({ success: true, data: { youtube_video_id: "dQw4w9WgXcQ" } })).toBe(true);
    expect(mutationRecordHasYouTubeId({ success: true, data: { youtube_video_id: null } })).toBe(false);
  });

  it("keeps enrollment gates separate from Unlisted URL secrecy", () => {
    expect(
      canAccessLessonVideo({
        courseStatus: "published",
        isEnrolled: true,
        isOwner: false,
      })
    ).toBe(true);
    expect(
      canAccessLessonVideo({
        courseStatus: "published",
        isEnrolled: false,
        isOwner: false,
      })
    ).toBe(false);
  });

  it("removes Academy Bunny upload and playback integration", () => {
    expect(existsSync("src/app/api/academy/video/create/route.ts")).toBe(false);
    expect(existsSync("src/app/api/academy/video/upload/route.ts")).toBe(false);
    expect(existsSync("src/app/api/academy/video/complete/route.ts")).toBe(false);
    expect(existsSync("src/lib/services/academy-video-service.ts")).toBe(false);
    expect(existsSync("src/lib/services/academy-video-actions.ts")).toBe(false);
    expect(existsSync("src/components/academy/BunnyPlayer.tsx")).toBe(false);

    const playback = readFileSync("src/lib/academy/video-playback.ts", "utf8");
    expect(playback.toLowerCase()).not.toContain("bunny");
    expect(playback).toContain("buildYouTubeEmbedUrl");

    const authoring = readFileSync("src/lib/academy/authoring-service.ts", "utf8");
    expect(authoring).not.toContain("from(\"academy_videos\")");
    expect(authoring).toContain("youtube_video_id");

    const access = readFileSync("src/lib/academy/course-access.ts", "utf8");
    expect(access).not.toContain("academy_videos");
    expect(access).toContain("youtube_video_id");

    const editor = readFileSync("src/components/academy/CourseEditor.tsx", "utf8");
    expect(editor).toContain("LessonYouTubeModal");
    expect(editor).toContain("CourseAuthoringGuide");
    expect(editor).not.toContain("MediaLibraryModal");
  });
});
