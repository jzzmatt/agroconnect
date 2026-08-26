import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildYouTubeEmbedUrl,
  extractYouTubeVideoId,
  isYouTubeVideoId,
} from "@/lib/academy/youtube";
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
    expect(extractYouTubeVideoId("not-a-video")).toBeNull();
    expect(isYouTubeVideoId(YT_ID)).toBe(true);
  });

  it("builds a YouTube nocookie embed URL", () => {
    expect(buildYouTubeEmbedUrl(YT_ID)).toBe(`https://www.youtube-nocookie.com/embed/${YT_ID}`);
    expect(buildAuthorizedEmbedUrl(YT_ID)).toContain(YT_ID);
    expect(buildAuthorizedEmbedUrl(null)).toBeNull();
  });

  it("requires a YouTube Video ID on every lesson before publication", () => {
    expect(validateCourseForPublication(courseWithLesson(YT_ID)).ok).toBe(true);
    expect(validateCourseForPublication(courseWithLesson(null)).ok).toBe(false);
    expect(validateCourseForPublication(courseWithLesson("vid-bunny")).ok).toBe(false);
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
    expect(existsSync("src/components/academy/AcademyVideoUploader.tsx")).toBe(false);
    expect(existsSync("src/components/academy/MediaLibraryModal.tsx")).toBe(false);

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
    expect(editor).not.toContain("MediaLibraryModal");
  });
});
