import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Phase 4 — Bunny Stream webhook security + Academy video durability.
 *
 * Covers the three cases called out for this phase:
 * 1. Webhook rejected when unsigned or misconfigured.
 * 2. Webhook accepted with a valid HMAC-SHA256 signature.
 * 3. The durable Academy video record actually updates from a
 *    Supabase-backed read — not an in-memory array reset.
 */

const WEBHOOK_SECRET = "test-bunny-webhook-secret";
const BUNNY_VIDEO_ID = "bunny-guid-1";

vi.mock("@/lib/media/db", async () => {
  const { createFakeSupabaseClient } = await import("@/test/helpers/fake-supabase");
  const client = createFakeSupabaseClient({
    academy_videos: [
      {
        id: "avid-1",
        owner_id: "owner-1",
        course_id: null,
        chapter_id: null,
        bunny_video_id: BUNNY_VIDEO_ID,
        bunny_library_id: "12345",
        title: "Aula de irrigação por gotejamento",
        description: null,
        filename: "aula-irrigacao.mp4",
        mime_type: "video/mp4",
        file_size: 52_428_800,
        duration_seconds: null,
        status: "uploading",
        visibility: "enrolled_only",
        thumbnail_url: null,
        playback_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  });
  return {
    getMediaSupabaseClient: () => client,
    tryGetMediaSupabaseClient: () => client,
  };
});

function signedRequest(body: string, signature?: string) {
  return new Request("http://localhost/api/webhooks/bunny", {
    method: "POST",
    headers: signature ? { "X-BunnyStream-Signature": signature } : {},
    body,
  }) as unknown as NextRequest;
}

describe("Bunny Stream webhook security (Phase 4)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.BUNNY_STREAM_API_KEY = "test-library-key";
    process.env.BUNNY_STREAM_LIBRARY_ID = "12345";
    process.env.BUNNY_STREAM_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("rejects a request with no signature header", async () => {
    const { POST } = await import("@/app/api/webhooks/bunny/route");
    const body = JSON.stringify({ VideoGuid: BUNNY_VIDEO_ID, Status: 4 });
    const response = await POST(signedRequest(body));
    expect(response.status).toBe(401);
  });

  it("rejects any signature — even one that looks well-formed — when no webhook secret is configured", async () => {
    delete process.env.BUNNY_STREAM_WEBHOOK_SECRET;
    const { POST } = await import("@/app/api/webhooks/bunny/route");
    const body = JSON.stringify({ VideoGuid: BUNNY_VIDEO_ID, Status: 4 });
    const plausibleLookingSignature = createHmac("sha256", "guessed-secret").update(body).digest("hex");
    const response = await POST(signedRequest(body, plausibleLookingSignature));
    expect(response.status).toBe(401);
  });

  it("rejects a signature computed with the wrong secret", async () => {
    const { POST } = await import("@/app/api/webhooks/bunny/route");
    const body = JSON.stringify({ VideoGuid: BUNNY_VIDEO_ID, Status: 4 });
    const wrongSignature = createHmac("sha256", "not-the-real-secret").update(body).digest("hex");
    const response = await POST(signedRequest(body, wrongSignature));
    expect(response.status).toBe(401);
  });

  it("accepts a correctly signed request and durably updates the Academy video row", async () => {
    const { POST } = await import("@/app/api/webhooks/bunny/route");
    const { AcademyVideoService } = await import("@/lib/services/academy-video-service");

    const body = JSON.stringify({
      VideoGuid: BUNNY_VIDEO_ID,
      Status: 4, // Bunny "Finished"
      ThumbnailUrl: "https://cdn.example.test/thumb.jpg",
    });
    const signature = createHmac("sha256", WEBHOOK_SECRET).update(body, "utf8").digest("hex");

    const response = await POST(signedRequest(body, signature));
    expect(response.status).toBe(200);

    // Re-read through an independent service call. If the webhook only
    // mutated a local variable or an in-memory array, this fresh read would
    // still show "uploading" — it does not, because the write landed in the
    // (fake) academy_videos table.
    const rows = await AcademyVideoService.listByOwner("owner-1");
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("ready");
    expect(rows[0].thumbnail_url).toBe("https://cdn.example.test/thumb.jpg");
  });
});
