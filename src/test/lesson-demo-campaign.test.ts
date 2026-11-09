import { afterEach, describe, expect, it } from "vitest";
import { AcademyAuthoringService } from "@/lib/academy/authoring-service";
import { createDemoShareCode, lessonDemoVideoUrl } from "@/lib/academy/lesson-demo";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

describe("lesson demo campaign", () => {
  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    AcademyAuthoringService.resetMemoryStore();
  });

  it("builds an eight-character public video link", () => {
    const code = createDemoShareCode();
    expect(code).toMatch(/^[a-z2-9]{8}$/);
    expect(lessonDemoVideoUrl("https://www.agroconnect.ao", code)).toBe(`https://www.agroconnect.ao/a/${code}`);
    expect(lessonDemoVideoUrl("https://www.agroconnect.ao", "https://storage.example/object/sign/video?token=abc")).toBeNull();
    expect(lessonDemoVideoUrl("http://localhost:3000", code)).toBeNull();
  });

  it("keeps a single owned lesson as the WhatsApp demo", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder-agroconnect.supabase.co";
    AcademyAuthoringService.resetMemoryStore();
    await AcademyAuthoringService.assignLessonYouTubeVideo("prof-seed-1", "les-seed-1", "dQw4w9WgXcQ");
    const second = await AcademyAuthoringService.createLesson("prof-seed-1", "sec-seed-1", "Segunda aula");
    await AcademyAuthoringService.assignLessonYouTubeVideo("prof-seed-1", second!.id, "dQw4w9WgXcQ");

    const first = await AcademyAuthoringService.markLessonDemoCampaign("prof-seed-1", "les-seed-1");
    expect(first?.demo_campaign).toBe(true);
    const replacement = await AcademyAuthoringService.markLessonDemoCampaign("prof-seed-1", second!.id);
    const tree = await AcademyAuthoringService.getCourseEditorTree("crs-seed-draft", "prof-seed-1");
    const lessons = tree?.sections.flatMap((section) => section.lessons) ?? [];

    expect(replacement?.demo_campaign).toBe(true);
    expect(replacement?.demo_share_code).toMatch(/^[a-z2-9]{8}$/);
    expect(lessons.filter((lesson) => lesson.demo_campaign)).toHaveLength(1);
    expect(lessons.find((lesson) => lesson.demo_campaign)?.id).toBe(second!.id);
    expect(await AcademyAuthoringService.markLessonDemoCampaign("prof-seed-1", "missing")).toBeNull();
  });
});
