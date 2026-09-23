import { describe, expect, it } from "vitest";
import { validateProductImage } from "@/lib/products/product-image-validation";
import { validateProfileImage } from "@/lib/agriprofile/profile-media-service";
import { buildProductImageStoragePath, buildProductVideoStoragePath } from "@/lib/media/product-media-paths";
import { buildTransportImageStoragePath } from "@/lib/media/transport-media-paths";
import { buildProfileAvatarStoragePath } from "@/lib/media/profile-media-paths";

describe("Supabase media path builders", () => {
  it("builds scoped product image paths", () => {
    const path = buildProductImageStoragePath({
      ownerId: "11111111-1111-1111-1111-111111111111",
      productId: "22222222-2222-2222-2222-222222222222",
      fileName: "crop.jpg",
    });
    expect(path).toMatch(/^11111111-1111-1111-1111-111111111111\/22222222/);
    expect(path).toContain("/images/");
    expect(path).not.toContain("..");
  });

  it("builds product video and transport paths", () => {
    const video = buildProductVideoStoragePath({
      ownerId: "11111111-1111-1111-1111-111111111111",
      productId: "22222222-2222-2222-2222-222222222222",
      fileName: "clip.mp4",
    });
    expect(video).toContain("/videos/");

    const transport = buildTransportImageStoragePath({
      ownerId: "11111111-1111-1111-1111-111111111111",
      transportId: "33333333-3333-3333-3333-333333333333",
      fileName: "truck.webp",
    });
    expect(transport).toContain("/images/");
  });

  it("builds profile avatar path under profile id", () => {
    const path = buildProfileAvatarStoragePath({
      profileId: "44444444-4444-4444-4444-444444444444",
      fileName: "me.png",
    });
    expect(path).toBe("44444444-4444-4444-4444-444444444444/avatar/avatar.png");
  });

  it("reuses existing image validation for product and profile", () => {
    expect(validateProductImage({ mimeType: "image/jpeg", fileSize: 1024 }).ok).toBe(true);
    expect(validateProfileImage({ mimeType: "image/jpeg", fileSize: 1024 }).ok).toBe(true);
    expect(validateProductImage({ mimeType: "image/gif", fileSize: 1024 }).ok).toBe(false);
  });
});
