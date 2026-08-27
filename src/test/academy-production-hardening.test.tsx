import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import React from "react";
import { I18nProvider } from "@/i18n/provider";
import { YouTubePlayer } from "@/components/academy/YouTubePlayer";
import {
  assertYouTubeEmbedUrl,
  isAllowedYouTubeEmbedUrl,
  buildYouTubeEmbedUrl,
} from "@/lib/academy/youtube";
import { authorizeLessonPlayback, canAccessLessonVideo } from "@/lib/academy/video-playback";
import { canSetCourseStatusViaGenericUpdate } from "@/lib/academy/course-lifecycle";
import { canPermanentlyDeleteCourse } from "@/lib/academy/course-delete-flow";
import { resolveLearnAccess } from "@/lib/academy/learn-access";
import type { CourseWithSections } from "@/types/agriacademy";

const YT_ID = "dQw4w9WgXcQ";
const EMBED = `https://www.youtube-nocookie.com/embed/${YT_ID}`;

function publishedCourse(): CourseWithSections {
  return {
    id: "crs-12",
    owner_id: "owner-1",
    title: "Curso",
    slug: "curso",
    description: "Desc",
    level: "beginner",
    price: 0,
    currency: "AOA",
    status: "published",
    lessons_count: 1,
    students_count: 0,
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sections: [
      {
        id: "sec-1",
        course_id: "crs-12",
        title: "Capítulo",
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lessons: [
          {
            id: "les-1",
            course_id: "crs-12",
            section_id: "sec-1",
            title: "Aula",
            sort_order: 1,
            youtube_video_id: YT_ID,
            is_free_preview: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      },
    ],
  };
}

describe("AGROCONNECT Phase 12 — YouTube Academy production hardening", () => {
  it("removes Academy Bunny services, actions and players", () => {
    expect(existsSync("src/lib/services/academy-video-service.ts")).toBe(false);
    expect(existsSync("src/lib/services/academy-video-actions.ts")).toBe(false);
    expect(existsSync("src/lib/academy/video-library-sync.ts")).toBe(false);
    expect(existsSync("src/components/academy/BunnyPlayer.tsx")).toBe(false);
    expect(existsSync("src/app/api/academy/video/create/route.ts")).toBe(false);

    const servicesIndex = readFileSync("src/lib/services/index.ts", "utf8");
    expect(servicesIndex).not.toContain("academy-video-service");
    expect(servicesIndex).toContain("course-service");

    const bunnyClient = readFileSync("src/lib/video/bunny.ts", "utf8");
    expect(bunnyClient).toContain("AgriShopping");
    expect(bunnyClient).not.toMatch(/AgriAcademy training video only/);

    expect(existsSync("src/components/shopping/BunnyPlayer.tsx")).toBe(true);
    expect(existsSync("src/app/api/webhooks/bunny/route.ts")).toBe(true);
    expect(existsSync("src/lib/products/bunny-upload.ts")).toBe(true);
  });

  it("rejects arbitrary iframe hosts and only allows the official YouTube embed", () => {
    expect(isAllowedYouTubeEmbedUrl(EMBED)).toBe(true);
    expect(assertYouTubeEmbedUrl(EMBED)).toBe(EMBED);
    expect(isAllowedYouTubeEmbedUrl("https://www.youtube.com/embed/" + YT_ID)).toBe(false);
    expect(isAllowedYouTubeEmbedUrl("https://vimeo.com/123")).toBe(false);
    expect(isAllowedYouTubeEmbedUrl("https://iframe.mediadelivery.net/embed/1/abc")).toBe(false);
    expect(isAllowedYouTubeEmbedUrl(`javascript:alert(1)`)).toBe(false);
    expect(buildYouTubeEmbedUrl(YT_ID)).toBe(EMBED);
  });

  it("does not render a non-YouTube iframe in the Academy player", () => {
    render(
      <I18nProvider initialLocale="pt">
        <YouTubePlayer
          embedUrl="https://iframe.mediadelivery.net/embed/1/secret"
          title="Aula"
          ready
          pendingLabel="A carregar"
        />
      </I18nProvider>
    );
    expect(screen.queryByTitle("Aula")).not.toBeInTheDocument();
    expect(screen.getByText("A carregar")).toBeInTheDocument();
  });

  it("enforces anonymous / unenrolled / enrolled learning access", () => {
    const course = publishedCourse();
    const lesson = { course_id: course.id, youtube_video_id: YT_ID };
    const courseRef = { id: course.id, owner_id: course.owner_id, status: course.status };

    expect(authorizeLessonPlayback({ profileId: null, lesson, course: courseRef, enrolled: false }).reason).toBe(
      "auth_required"
    );
    expect(
      authorizeLessonPlayback({
        profileId: "student-1",
        lesson,
        course: courseRef,
        enrolled: false,
      }).reason
    ).toBe("not_enrolled");

    const allowed = authorizeLessonPlayback({
      profileId: "student-1",
      lesson,
      course: courseRef,
      enrolled: true,
    });
    expect(allowed).toEqual({ allowed: true, embedUrl: EMBED });

    expect(resolveLearnAccess({ course, profileId: null, enrolled: false, isOwner: false }).allowed).toBe(false);
    expect(
      resolveLearnAccess({ course, profileId: "student-1", enrolled: false, isOwner: false }).allowed
    ).toBe(false);
    expect(
      resolveLearnAccess({ course, profileId: "student-1", enrolled: true, isOwner: false }).allowed
    ).toBe(true);
    expect(canAccessLessonVideo({ courseStatus: "published", isEnrolled: true, isOwner: false })).toBe(true);
  });

  it("blocks generic updates from publishing and requires pause before delete", () => {
    expect(canSetCourseStatusViaGenericUpdate("published")).toBe(false);
    expect(canSetCourseStatusViaGenericUpdate("paused")).toBe(true);
    expect(canSetCourseStatusViaGenericUpdate("draft")).toBe(true);
    expect(canPermanentlyDeleteCourse("published")).toBe(false);
    expect(canPermanentlyDeleteCourse("paused")).toBe(true);

    const actions = readFileSync("src/lib/services/course-actions.ts", "utf8");
    expect(actions).toContain("canSetCourseStatusViaGenericUpdate");
    expect(actions).toContain("validateCourseForPublication");
  });

  it("does not call external YouTube APIs from Academy source", () => {
    const files = [
      "src/lib/academy/youtube.ts",
      "src/lib/academy/video-playback.ts",
      "src/lib/academy/course-access.ts",
      "src/components/academy/YouTubePlayer.tsx",
      "src/components/academy/ProtectedLessonPlayer.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/googleapis\.com\/youtube/i);
      expect(source).not.toMatch(/youtube\/v3/i);
    }
  });
});
