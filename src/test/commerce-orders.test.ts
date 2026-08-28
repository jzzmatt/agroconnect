import { describe, it, expect, beforeEach } from "vitest";
import {
  CommerceService,
} from "@/lib/services/commerce-service";
import { PaymentService, SandboxPaymentAdapter } from "@/lib/payments";
import { MarketplaceService } from "@/lib/services/marketplace-service";
import { ShoppingService } from "@/lib/services/shopping-service";

describe("AGROCONNECT Phase 8 — Commerce, Cart, Orders & Payments Foundation", () => {
  beforeEach(async () => {
    CommerceService.resetMemoryStore();
  });

  it("1. Adds products to cart and calculates subtotal/total server-side", async () => {
    const cart1 = await CommerceService.addToCart({
      productId: "prd-seed-1",
      quantity: 2,
    });

    expect(cart1.items.length).toBe(1);
    expect(cart1.items[0].quantity).toBe(2);
    expect(cart1.items[0].unit_price).toBe(28500);
    expect(cart1.subtotal).toBe(57000);
    expect(cart1.total).toBe(57000);
  });

  it("2. Handles multi-seller cart and groups items by seller", async () => {
    // Add product from Seller 1 (Dr. João Silva)
    await CommerceService.addToCart({
      productId: "prd-seed-1",
      quantity: 1,
    });

    // Add product from Seller 2 (Eng.ª Maria Santos)
    const cart = await CommerceService.addToCart({
      productId: "prd-seed-2",
      quantity: 1,
    });

    expect(cart.items.length).toBe(2);
    expect(cart.sellers_count).toBe(2);
    expect(cart.total).toBe(28500 + 480000);
  });

  it("3. Updates item quantity and removes product when quantity is 0", async () => {
    await CommerceService.addToCart({
      productId: "prd-seed-1",
      quantity: 3,
    });

    const updated = await CommerceService.updateCartItemQuantity("prd-seed-1", 5);
    expect(updated.items[0].quantity).toBe(5);
    expect(updated.subtotal).toBe(5 * 28500);

    const afterRemove = await CommerceService.updateCartItemQuantity("prd-seed-1", 0);
    expect(afterRemove.items.length).toBe(0);
    expect(afterRemove.total).toBe(0);
  });

  it("4. Creates atomic checkout order with human-readable order number and seller fulfillment groups", async () => {
    await CommerceService.addToCart({
      productId: "prd-seed-1",
      quantity: 2,
    });

    await CommerceService.addToCart({
      productId: "prd-seed-2",
      quantity: 1,
    });

    const result = await CommerceService.checkoutOrder({
      fulfillmentMethod: "delivery",
      shippingAddressSnapshot: {
        recipient_name: "António Manuel",
        phone: "+244 923 999 888",
        province_name: "Huambo",
        municipality_name: "Caála",
        address_line: "Fazenda Kwanza, Lote 4",
      },
      paymentMethod: "mock_sandbox",
    });

    expect(result.success).toBe(true);
    expect(result.order).toBeDefined();
    expect(result.order.order_number).toMatch(/^AGC-\d{4}-\d{6}$/);
    expect(result.order.status).toBe("paid");
    expect(result.order.payment_status).toBe("paid");
    expect(result.order.seller_groups.length).toBe(2);
    expect(result.order.items.length).toBe(2);

    // Cart should be emptied automatically
    const currentCart = await CommerceService.getCart();
    expect(currentCart.items.length).toBe(0);
  });

  it("5. Verifies historical unit_price snapshot in order items", async () => {
    await CommerceService.addToCart({
      productId: "prd-seed-1",
      quantity: 1,
    });

    const result = await CommerceService.checkoutOrder({
      fulfillmentMethod: "pickup",
      paymentMethod: "mock_sandbox",
    });

    const orderItem = result.order.items[0];
    expect(orderItem.product_title).toBe("Semente de Milho Híbrido Certificada ZM-521 (25kg)");
    expect(orderItem.unit_price).toBe(28500);
    expect(orderItem.subtotal).toBe(28500);
  });

  it("6. Payment Provider Abstraction: processes test intent and validates webhook", async () => {
    const provider = PaymentService.getProvider();
    expect(provider.id).toBe("sandbox_mock");
    expect(provider.isSandbox).toBe(true);

    const intent = await PaymentService.createPayment({
      orderId: "ord-test-1",
      orderNumber: "AGC-2026-000099",
      amount: 50000,
      currency: "AOA",
      paymentMethod: "mock_sandbox",
    });

    expect(intent.success).toBe(true);
    expect(intent.status).toBe("paid");
    expect(intent.providerPaymentId).toBeDefined();

    const webhookResult = await PaymentService.handleWebhook(
      JSON.stringify({
        eventId: "evt_test_123",
        eventType: "payment.confirmed",
        orderId: "ord-test-1",
        status: "paid",
        amount: 50000,
      }),
      { "x-payment-webhook-secret": "sandbox-dev-secret" }
    );

    expect(webhookResult.isValid).toBe(true);
    expect(webhookResult.status).toBe("paid");
  });

  it("7. Seller updates fulfillment status to ready_for_pickup and completed", async () => {
    const orderNumber = "AGC-2026-000001";
    const sellerId = "prov-seed-1";

    const updated = await CommerceService.updateFulfillmentStatus(
      orderNumber,
      sellerId,
      "ready_for_pickup"
    );
    expect(updated).toBe(true);

    const order = await CommerceService.getOrderByNumber(orderNumber);
    const group = order?.seller_groups.find((sg) => sg.seller_id === sellerId);
    expect(group?.status).toBe("ready_for_pickup");
  });

  it("8. Customer cancellation workflow updates order status", async () => {
    await CommerceService.addToCart({
      productId: "prd-seed-3",
      quantity: 1,
    });

    const { order } = await CommerceService.checkoutOrder({
      fulfillmentMethod: "delivery",
      paymentMethod: "mock_sandbox",
    });

    const cancelled = await CommerceService.cancelOrder(order.order_number, "Mudança de planos");
    expect(cancelled).toBe(true);

    const updated = await CommerceService.getOrderByNumber(order.order_number);
    expect(updated?.status).toBe("cancelled");
    expect(updated?.cancelled_reason).toBe("Mudança de planos");
  });

  it("9. Regression Test: Phase 6 Services and Phase 7 Shopping Discovery remain intact", async () => {
    const services = await MarketplaceService.searchServices({ query: "irrigação" });
    expect(services.services.length).toBeGreaterThan(0);

    const products = await ShoppingService.searchProducts({ query: "milho" });
    expect(products.products.length).toBeGreaterThan(0);
  });

  it("10. Does not dump every order when sellerId is omitted", async () => {
    const leaked = await CommerceService.getSellerOrders();
    expect(leaked).toEqual([]);
  });

  it("11. Checkout snapshots the catalog price, not a tampered cart price", async () => {
    await CommerceService.addToCart({ productId: "prd-seed-1", quantity: 1 });
    const cart = await CommerceService.getCart();
    cart.items[0].unit_price = 1;
    cart.items[0].subtotal = 1;

    const result = await CommerceService.checkoutOrder({
      fulfillmentMethod: "pickup",
      paymentMethod: "mock_sandbox",
    });

    expect(result.order.items[0].unit_price).toBe(28500);
    expect(result.order.items[0].subtotal).toBe(28500);
  });

  it("12. Rejects sandbox payment webhooks without a shared secret", async () => {
    const denied = await PaymentService.handleWebhook(
      JSON.stringify({
        eventId: "evt_forged",
        eventType: "payment.confirmed",
        orderId: "ord-test-1",
        status: "paid",
        amount: 1,
      }),
      {}
    );
    expect(denied.isValid).toBe(false);
  });

  it("13. Scopes customer orders and seller earnings to the actor", async () => {
    await CommerceService.addToCart({ productId: "prd-seed-1", quantity: 1 });
    const { order } = await CommerceService.checkoutOrder({
      fulfillmentMethod: "pickup",
      paymentMethod: "mock_sandbox",
    });

    const mine = await CommerceService.getCustomerOrders({ customerId: "demo-user" });
    expect(mine.some((entry) => entry.order_number === order.order_number)).toBe(true);

    const other = await CommerceService.getCustomerOrders({ customerId: "someone-else" });
    expect(other.some((entry) => entry.order_number === order.order_number)).toBe(false);

    const sellerOrders = await CommerceService.getSellerOrders("prov-seed-1");
    expect(sellerOrders.some((entry) => entry.order_number === order.order_number)).toBe(true);
    expect(sellerOrders.every((entry) => entry.seller_groups.every((group) => group.seller_id === "prov-seed-1"))).toBe(
      true
    );

    const earnings = await CommerceService.getSellerEarnings("prov-seed-1");
    expect(earnings.processing_count + earnings.completed_count).toBeGreaterThan(0);
    expect(earnings.total_earned).toBe(0);

    await CommerceService.updateFulfillmentStatus("AGC-2026-000001", "prov-seed-1", "completed");
    const completedEarnings = await CommerceService.getSellerEarnings("prov-seed-1");
    expect(completedEarnings.total_earned).toBe(57000);
    expect(completedEarnings.completed_count).toBeGreaterThan(0);
  });
});
