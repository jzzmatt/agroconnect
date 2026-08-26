import { describe, it, expect } from "vitest";
import { isSelectableLibraryVideo, planLibraryReconcile } from "@/lib/academy/video-library-sync";
import type { AcademyVideoDescriptor } from "@/types/agriacademy";

function video(overrides: Partial<AcademyVideoDescriptor> = {}): AcademyVideoDescriptor {
  return {
    id: "vid-1",
    owner_id: "owner-1",
    bunny_video_id: "bunny-1",
    bunny_library_id: "lib-1",
    title: "Demo",
    file_size: 1024,
    status: "ready",
    visibility: "enrolled_only",
    reference_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("Academy video library Bunny reconciliation", () => {
  it("removes unreferenced rows missing from Bunny", () => {
    expect(planLibraryReconcile({ video: video(), remote: null })).toEqual({ action: "remove" });
  });

  it("marks referenced rows missing from Bunny as failed", () => {
    expect(
      planLibraryReconcile({
        video: video({ reference_count: 2 }),
        remote: null,
      })
    ).toEqual({ action: "mark_failed", nextStatus: "failed" });
  });

  it("syncs stale status and metadata from Bunny", () => {
    expect(
      planLibraryReconcile({
        video: video({ status: "processing", playback_url: null }),
        remote: {
          guid: "bunny-1",
          title: "Demo",
          status: "ready",
          thumbnailUrl: "https://cdn.example/thumb.jpg",
          durationSeconds: 120,
        },
      })
    ).toEqual({ action: "sync", nextStatus: "ready" });
  });

  it("keeps rows already aligned with Bunny", () => {
    expect(
      planLibraryReconcile({
        video: video({
          status: "ready",
          playback_url: "https://iframe.mediadelivery.net/embed/lib-1/bunny-1",
          thumbnail_url: "https://cdn.example/thumb.jpg",
          duration_seconds: 120,
        }),
        remote: {
          guid: "bunny-1",
          title: "Demo",
          status: "ready",
          thumbnailUrl: "https://cdn.example/thumb.jpg",
          durationSeconds: 120,
        },
      })
    ).toEqual({ action: "keep" });
  });

  it("hides deleted and failed videos from the picker list", () => {
    expect(isSelectableLibraryVideo(video({ status: "ready" }))).toBe(true);
    expect(isSelectableLibraryVideo(video({ status: "failed" }))).toBe(false);
    expect(isSelectableLibraryVideo(video({ status: "deleted" }))).toBe(false);
  });
});
