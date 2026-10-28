import { describe, expect, it } from "vitest";
import { isRetiredMediaUrl, visibleMediaUrl } from "@/lib/media/retired-media-url";

describe("retired media URLs", () => {
  it("hides ImageKit and Bunny hosts", () => {
    expect(isRetiredMediaUrl("https://ik.imagekit.io/demo/photo.jpg")).toBe(true);
    expect(isRetiredMediaUrl("https://video.b-cdn.net/clip.mp4")).toBe(true);
    expect(isRetiredMediaUrl("https://vz-123.b-cdn.net/play.mp4")).toBe(true);
    expect(isRetiredMediaUrl("https://iframe.mediadelivery.net/embed/1/abc")).toBe(true);
    expect(isRetiredMediaUrl("https://cdn.bunnycdn.com/file.jpg")).toBe(true);
    expect(visibleMediaUrl("https://ik.imagekit.io/demo/photo.jpg")).toBeNull();
  });

  it("keeps Supabase and application URLs", () => {
    const stored = "https://project.supabase.co/storage/v1/object/sign/product-media/a.jpg";
    expect(isRetiredMediaUrl(stored)).toBe(false);
    expect(visibleMediaUrl(stored)).toBe(stored);
    expect(visibleMediaUrl("/api/products/1/primary-image")).toBe("/api/products/1/primary-image");
    expect(visibleMediaUrl(null)).toBeNull();
  });
});