import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SUBSCRIPTION_PLANS,
  getUserEntitlements,
  normalizePlanSlug,
  VIDEO_STORAGE_QUOTA_BYTES,
  GB,
  getStorageWarningLevel,
} from "@/lib/services/pricing-service";
import { resetAuthoritativeSubscriptions, setAuthoritativeSubscription, getAuthoritativeSubscription } from "@/lib/subscription/store";
import { getMarketCountry, DEFAULT_MARKET_COUNTRY, MARKET_COUNTRIES } from "@/config/markets";
import { getDictionary } from "@/i18n";
import { defaultLocale, supportedLocales } from "@/i18n/config";
import { validateProductImage, ProductMediaService, buildProductImageAlt } from "@/lib/services/product-media-service";
import { AcademyVideoService } from "@/lib/services/academy-video-service";
import { PaymentService, MulticaixaOnlineAdapter } from "@/lib/payments";
import { canTransitionDeliveryStatus } from "@/lib/logistics/state-machine";

// Hoisted by vitest above the imports above, so both media services see the
// fake Supabase client instead of reaching for real credentials in tests.
vi.mock("@/lib/media/db", async () => {
  const { createFakeSupabaseClient } = await import("@/test/helpers/fake-supabase");
  const client = createFakeSupabaseClient();
  return {
    getMediaSupabaseClient: () => client,
    tryGetMediaSupabaseClient: () => client,
  };
});

vi.mock("@/lib/media/imagekit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/media/imagekit")>("@/lib/media/imagekit");
  return {
    ...actual,
    uploadBufferToImageKit: async (params: { fileName: string }) => ({
      configured: true,
      fileId: `fk-${params.fileName}`,
      url: `https://ik.imagekit.io/agroconnect-test/${params.fileName}`,
      thumbnailUrl: null,
      filePath: `/agriconnect/products/test/${params.fileName}`,
      fileSize: 1024,
    }),
    deleteImageKitFile: async () => true,
  };
});

describe("Phase 9.5 — Plan sync, globalization, images, Bunny, market", () => {
  beforeEach(() => {
    resetAuthoritativeSubscriptions();
  });

  it("uses authoritative subscription store instead of client-only selectedPlan", () => {
    expect(getAuthoritativeSubscription("user-1")).toBeNull();
    const record = setAuthoritativeSubscription("user-1", { plan: "professional" });
    expect(record.plan).toBe("professional");
    expect(getAuthoritativeSubscription("user-1")?.plan).toBe("professional");
  });

  it("Basic → Professional unlocks AgriShopping, AgriAcademy, images, country, 10 products, 100 GB", () => {
    const before = getUserEntitlements({ subscriptionPlan: "basic" });
    expect(before.can_access_agrishopping).toBe(false);
    expect(before.can_access_agriacademy).toBe(false);
    expect(before.can_upload_product_images).toBe(false);
    expect(before.can_change_market_country).toBe(false);
    expect(before.product_limit).toBe(0);
    expect(before.video_storage_limit_gb).toBe(0);

    const after = getUserEntitlements({ subscriptionPlan: "professional" });
    expect(after.can_access_agrishopping).toBe(true);
    expect(after.can_access_agriacademy).toBe(true);
    expect(after.can_create_courses).toBe(true);
    expect(after.can_upload_product_images).toBe(true);
    expect(after.can_change_market_country).toBe(true);
    expect(after.product_limit).toBe(10);
    expect(after.video_storage_limit_bytes).toBe(100 * GB);
  });

  it("Professional → Business unlocks unlimited products and 300 GB", () => {
    const biz = getUserEntitlements({ subscriptionPlan: "business" });
    expect(biz.product_limit).toBeNull();
    expect(biz.video_storage_limit_gb).toBe(300);
    expect(biz.can_access_agriacademy).toBe(true);
    expect(biz.can_request_custom_payment_gateway).toBe(false);
  });

  it("Business → Enterprise sets 80.000 Kz, 1 TB, and custom gateway service", () => {
    expect(SUBSCRIPTION_PLANS.enterprise.priceMonthlyAoa).toBe(80000);
    expect(SUBSCRIPTION_PLANS.enterprise.priceFormatted).toBe("80.000 Kz");
    const ent = getUserEntitlements({ subscriptionPlan: "enterprise" });
    expect(ent.video_storage_limit_bytes).toBe(1024 * GB);
    expect(ent.can_request_custom_payment_gateway).toBe(true);
    expect(ent.product_limit).toBeNull();
  });

  it("downgrade does not imply product deletion; new creation locks at 10", () => {
    const locked = getUserEntitlements({
      subscriptionPlan: "professional",
      activeProductCount: 12,
    });
    expect(locked.can_edit_products).toBe(true);
    expect(locked.can_create_products).toBe(true);
    expect(locked.product_limit_reached).toBe(true);
    expect(locked.product_limit).toBe(10);
  });

  it("language is independent from country", () => {
    expect(DEFAULT_MARKET_COUNTRY).toBe("AO");
    const angola = getMarketCountry("AO");
    expect(angola.currencyCode).toBe("AOA");
    expect(angola.currencySymbol).toBe("Kz");
    expect(angola.paymentMethods.some((m) => m.id === "multicaixa_online")).toBe(true);

    const france = getMarketCountry("FR");
    expect(france.currencyCode).toBe("EUR");
    expect(france.suggestedLocale).toBe("fr");
  });

  it("supports pt, en, fr with Portuguese fallback", () => {
    expect(defaultLocale).toBe("pt");
    expect(supportedLocales).toEqual(["pt", "en", "fr"]);
    expect(getDictionary("pt").glossary.order).toBe("Pedido");
    expect(getDictionary("en").glossary.order).toBe("Order");
    expect(getDictionary("fr").glossary.order).toBe("Commande");
    expect(getDictionary("xx" as any).navigation.dashboard).toBe("Painel");
  });

  it("validates product images, persists metadata in Supabase, and uploads the bytes to ImageKit", async () => {
    expect(validateProductImage({ mimeType: "image/gif", fileSize: 100 }).ok).toBe(false);
    expect(validateProductImage({ mimeType: "image/jpeg", fileSize: 1024 }).ok).toBe(true);
    expect(buildProductImageAlt("Milho amarelo")).toBe("Milho amarelo — AgriConnect");

    const image = await ProductMediaService.add({
      productId: "p1",
      ownerId: "owner-1",
      buffer: Buffer.from("fake-jpeg-bytes"),
      fileName: "milho.jpg",
      mimeType: "image/jpeg",
      fileSize: 1024,
      altText: buildProductImageAlt("Milho amarelo"),
      isPrimary: true,
    });
    expect(image.is_primary).toBe(true);
    // The record is round-tripped through the (fake) product_images table —
    // not held in a Map — so a second, independent read sees the same image.
    expect(await ProductMediaService.primaryUrl("p1")).toContain("ik.imagekit.io");
    expect((await ProductMediaService.list("p1"))[0]?.id).toBe(image.id);
  });

  it("enforces AgriAcademy video quota before upload", async () => {
    const basic = await AcademyVideoService.canAcceptUpload({
      ownerId: "u1",
      plan: "basic",
      incomingBytes: 1,
    });
    expect(basic.ok).toBe(false);

    const proOk = await AcademyVideoService.canAcceptUpload({
      ownerId: "u2",
      plan: "professional",
      incomingBytes: 10 * GB,
    });
    expect(proOk.ok).toBe(true);

    const proOver = await AcademyVideoService.canAcceptUpload({
      ownerId: "u3",
      plan: "professional",
      incomingBytes: 101 * GB,
    });
    expect(proOver.ok).toBe(false);
    if (!proOver.ok) expect(proOver.error).toContain("Limite de armazenamento atingido");
  });

  it("Multicaixa Online does not fake a paid transaction without credentials", async () => {
    const adapter = new MulticaixaOnlineAdapter();
    const result = await adapter.createPaymentIntent({
      orderId: "ord-1",
      orderNumber: "AGC-2026-000099",
      amount: 2500,
      currency: "AOA",
      paymentMethod: "multicaixa_online",
    });
    expect(result.status).not.toBe("paid");
    expect(result.success).toBe(false);
    expect(result.provider).toBe("multicaixa_online");
  });

  it("exposes Angola Multicaixa option via payment configuration", () => {
    const methods = PaymentService.getConfiguredMethods("AO");
    expect(methods.some((m) => m.id === "multicaixa_online")).toBe(true);
  });

  it("does not regress Phase 9 delivery transitions", () => {
    expect(canTransitionDeliveryStatus("in_transit", "delivered")).toBe(true);
    expect(canTransitionDeliveryStatus("delivered", "picked_up")).toBe(false);
  });

  it("storage warning thresholds", () => {
    expect(getStorageWarningLevel(80, 100)).toBe("warn");
    expect(getStorageWarningLevel(90, 100)).toBe("critical");
    expect(getStorageWarningLevel(100, 100)).toBe("full");
  });

  it("lists all market countries with ISO codes", () => {
    expect(Object.keys(MARKET_COUNTRIES)).toEqual(["AO", "FR", "PT", "US", "GB"]);
  });
});
