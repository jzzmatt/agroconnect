import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PaymentService } from "@/lib/payments";
import { SANDBOX_DEV_WEBHOOK_SECRET } from "@/lib/commerce/webhook-secret";
import { NotificationService } from "@/lib/services/notification-service";

const actions = readFileSync("src/lib/services/commerce-actions.ts", "utf8");
const logisticsActions = readFileSync("src/lib/services/logistics-actions.ts", "utf8");
const persist = readFileSync("src/lib/commerce/persist.ts", "utf8");
const service = readFileSync("src/lib/services/commerce-service.ts", "utf8");

describe("AGROCONNECT Phase 11 — Commerce authorization and persistence", () => {
  it("requires auth and binds seller identity on the session, not the client", () => {
    expect(actions).toMatch(/export async function addToCartAction/);
    expect(actions).toContain("await requireCustomer()");
    expect(actions).toContain("await requireAuth()");
    expect(actions).toContain("resolveSessionSellerId");
    expect(actions).toMatch(/export async function getSellerOrdersAction\(\)/);
    expect(actions).not.toMatch(/getSellerOrdersAction\(sellerId/);
    expect(actions).toContain("CommerceService.getSellerOrders(sellerId, PERSIST)");
    expect(actions).toContain("updateFulfillmentStatus(orderNumber, sellerId, nextStatus, PERSIST)");
    expect(actions).toContain("_sellerId");
  });

  it("returns serializable cart mutation results instead of throwing across the client boundary", () => {
    expect(actions).toContain("export type CartMutationResult");
    expect(actions).toContain("runCartMutation");
    expect(actions).toContain("toSerializableCart");
    expect(actions).toContain("cartErrorMessage");
    expect(actions).toMatch(/addToCartAction[\s\S]*runCartMutation/);
    expect(actions).toMatch(/updateCartItemQuantityAction[\s\S]*runCartMutation/);
    expect(actions).toMatch(/removeFromCartAction[\s\S]*runCartMutation/);
    expect(actions).toContain("success: false");
  });

  it("never trusts client-provided prices or seller ids at checkout persistence", () => {
    expect(persist).toContain("product.price");
    expect(persist).toContain("product.seller_id");
    expect(persist).not.toContain("input.unit_price");
    expect(persist).not.toContain("input.sellerId");
    expect(service).toContain("freshProduct.price");
    expect(service).toContain("freshProduct.seller_id");
  });

  it("scopes logistics courier updates and notifications to the signed-in user", () => {
    expect(logisticsActions).toContain("resolveSessionSellerId");
    expect(logisticsActions).toContain("sellerId,");
    expect(logisticsActions).toContain("getCurrentUserProfile");
    expect(logisticsActions).toContain("NotificationService.getUserNotifications(profile.id");
  });

  it("accepts a sandbox webhook only with the shared secret", async () => {
    const allowed = await PaymentService.handleWebhook(
      JSON.stringify({
        eventId: "evt_ok",
        eventType: "payment.confirmed",
        orderId: "ord-1",
        status: "paid",
        amount: 10,
      }),
      { "x-payment-webhook-secret": SANDBOX_DEV_WEBHOOK_SECRET }
    );
    expect(allowed.isValid).toBe(true);

    const denied = await PaymentService.handleWebhook(
      JSON.stringify({
        eventId: "evt_bad",
        eventType: "payment.confirmed",
        orderId: "ord-1",
        status: "paid",
        amount: 10,
      }),
      { "x-payment-webhook-secret": "wrong" }
    );
    expect(denied.isValid).toBe(false);
  });

  it("does not leak other users' in-memory notifications", async () => {
    NotificationService.resetMemoryStore();
    await NotificationService.createNotification({
      profileId: "user-a",
      type: "order.paid",
      title: "A",
      message: "A",
    });
    const forB = await NotificationService.getUserNotifications("user-b");
    expect(forB.some((item) => item.profile_id === "user-a")).toBe(false);
  });

  it("applies verified payment webhooks through the existing payments route", () => {
    const route = readFileSync("src/app/api/payments/webhook/route.ts", "utf8");
    expect(route).toContain("persistApplyPaymentWebhook");
    expect(route).toContain("PaymentService.handleWebhook");
    expect(readFileSync("src/app/api/webhooks/payments/route.ts", "utf8")).toContain(
      'export { POST } from "@/app/api/payments/webhook/route"'
    );
  });
});
