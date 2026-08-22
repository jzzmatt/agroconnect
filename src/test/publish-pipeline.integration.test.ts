// @vitest-environment node
/**
 * Exercises the real publish pipeline against the configured Supabase project:
 * plan activation, profile bootstrap, seller creation, product insert, and
 * image upload. Only the Clerk session boundary is mocked.
 *
 * This writes to (and cleans up after itself in) the configured project, so it
 * is opt-in rather than part of the default suite:
 *
 *   RUN_SUPABASE_INTEGRATION=1 npx vitest run src/test/publish-pipeline.integration.test.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

const ENV_PATH = resolve(process.cwd(), ".env.local");

function loadEnvLocal(): Record<string, string> {
  if (!existsSync(ENV_PATH)) return {};
  const parsed: Record<string, string> = {};
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    parsed[trimmed.slice(0, index)] = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return parsed;
}

const envLocal = loadEnvLocal();
for (const [key, value] of Object.entries(envLocal)) {
  if (!process.env[key]) process.env[key] = value;
}

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const configured =
  process.env.RUN_SUPABASE_INTEGRATION === "1" &&
  Boolean(supabaseUrl) &&
  !supabaseUrl.includes("placeholder") &&
  Boolean(serviceRoleKey);

const CLERK_USER_ID = `user_pipeline_probe_${Date.now()}`;

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: CLERK_USER_ID, getToken: async () => null }),
  currentUser: async () => ({
    id: CLERK_USER_ID,
    username: "pipeline-probe",
    fullName: "Pipeline Probe",
    firstName: "Pipeline",
    lastName: "Probe",
    imageUrl: null,
    emailAddresses: [{ emailAddress: "pipeline-probe@agroconnect.test" }],
    phoneNumbers: [],
  }),
}));

async function rest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

describe.skipIf(!configured)("product video status reconciliation", () => {
  it("moves a stuck video row to the state Bunny reports", async () => {
    const pending = await rest(
      "/product_videos?status=in.(pending,uploading,processing)&select=id,product_id,status,bunny_video_id"
    );
    const rows = (pending.body || []) as Array<{
      product_id: string;
      status: string;
      bunny_video_id: string | null;
    }>;

    if (rows.length === 0) {
      console.warn("[integration] no pending video rows to reconcile");
      return;
    }

    const { reconcileProductVideoStatus } = await import("@/lib/products/video-status");
    for (const row of rows) {
      const before = row.status;
      const result = await reconcileProductVideoStatus(row.product_id);
      expect(result).not.toBeNull();
      console.warn(
        `[integration] product ${row.product_id}: ${before} -> ${result?.status}`
      );

      const after = await rest(
        `/product_videos?product_id=eq.${row.product_id}&select=status`
      );
      expect(after.body[0].status).toBe(result?.status);
    }
  }, 60000);
});

describe.skipIf(!configured)("publish pipeline against live Supabase", () => {
  const created: { productId?: string; profileId?: string } = {};

  afterAll(async () => {
    if (created.productId) {
      await rest(`/product_images?product_id=eq.${created.productId}`, { method: "DELETE" });
      await rest(`/product_videos?product_id=eq.${created.productId}`, { method: "DELETE" });
      await rest(`/products?id=eq.${created.productId}`, { method: "DELETE" });
    }
    if (created.profileId) {
      await rest(`/provider_profiles?profile_id=eq.${created.profileId}`, { method: "DELETE" });
      await rest(`/user_roles?profile_id=eq.${created.profileId}`, { method: "DELETE" });
      await rest(`/profiles?id=eq.${created.profileId}`, { method: "DELETE" });
    }
  });

  it("activates Professional and stores it on the profile row", async () => {
    const { activateUserSubscriptionPlan } = await import("@/lib/subscription/activate-plan");
    const result = await activateUserSubscriptionPlan("professional");

    expect(result.success).toBe(true);
    expect(result.plan).toBe("professional");
    // The regression: activation used to succeed while persisting nothing.
    expect(result.persisted).toBe(true);

    const stored = await rest(
      `/profiles?clerk_user_id=eq.${CLERK_USER_ID}&select=id,subscription_plan`
    );
    expect(stored.status).toBe(200);
    expect(stored.body).toHaveLength(1);
    expect(stored.body[0].subscription_plan).toBe("professional");
    created.profileId = stored.body[0].id;
  }, 30000);

  it("publishes a product with a real UUID that is readable back", async () => {
    const { createPublishedProduct } = await import("@/lib/products/create-product");
    const result = await createPublishedProduct({
      title: "Semente de milho híbrido ZM-521 (probe)",
      description: "Publicação de teste automatizada.",
      price: 45000,
      quantity: 10,
      unit: "saco",
      categorySlug: "sementes-de-milho",
      provinceName: "Huambo",
      municipalityName: "Caála",
      status: "published",
    });

    expect(result.code).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.product?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    created.productId = result.product!.id;

    const stored = await rest(
      `/products?id=eq.${created.productId}&select=id,title,status,seller_id,price`
    );
    expect(stored.body).toHaveLength(1);
    expect(stored.body[0].status).toBe("published");
    expect(Number(stored.body[0].price)).toBe(45000);
  }, 45000);

  it("issues a Bunny Stream upload authorization for a product video", async () => {
    const bunnyConfigured =
      Boolean(process.env.BUNNY_STREAM_API_KEY) && Boolean(process.env.BUNNY_STREAM_LIBRARY_ID);
    if (!bunnyConfigured) {
      console.warn("[integration] Bunny keys absent; skipping video authorization check");
      return;
    }

    const { POST } = await import("@/app/api/products/video/create/route");
    const response = await POST(
      new Request("http://localhost:3000/api/products/video/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: created.productId,
          title: "Vídeo de teste — probe",
          filename: "milho-video.mp4",
          mimeType: "video/mp4",
          fileSize: 596272,
          durationSeconds: 8,
        }),
      })
    );
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(200);
    expect(payload.success).toBe(true);
    // The browser needs all four to run the TUS upload.
    expect(payload.upload.uploadUrl).toBe("https://video.bunnycdn.com/tusupload");
    expect(payload.upload.bunnyVideoId).toBeTruthy();
    expect(payload.upload.authorizationSignature).toMatch(/^[0-9a-f]{64}$/);
    expect(payload.upload.authorizationExpire).toBeGreaterThan(Math.floor(Date.now() / 1000));

    // Remove the placeholder video so the Stream library stays clean.
    const { deleteBunnyVideo } = await import("@/lib/video/bunny");
    await deleteBunnyVideo(payload.upload.bunnyVideoId).catch(() => undefined);
  }, 45000);

  it("uploads a product photo through the images route", async () => {
    const { POST } = await import("@/app/api/products/images/route");

    const jpeg = existsSync("/tmp/milho-teste.jpg")
      ? readFileSync("/tmp/milho-teste.jpg")
      : Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x01, 0xff, 0xd9]);

    const form = new FormData();
    form.append("productId", created.productId!);
    form.append("file", new File([new Uint8Array(jpeg)], "milho-teste.jpg", { type: "image/jpeg" }));
    form.append("isPrimary", "true");
    form.append("altText", "Semente de milho — teste");

    const response = await POST(
      new Request("http://localhost:3000/api/products/images", { method: "POST", body: form })
    );
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.image.url).toContain("product-images");

    const stored = await rest(
      `/product_images?product_id=eq.${created.productId}&select=id,url,is_primary`
    );
    expect(stored.body).toHaveLength(1);
    expect(stored.body[0].is_primary).toBe(true);
  }, 45000);
});
