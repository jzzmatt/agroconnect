import { describe, it, expect } from "vitest";
import {
  canTransitionOrderStatus,
  canTransitionDeliveryStatus,
  generateDeliveryOTP,
} from "@/lib/logistics/state-machine";
import { LogisticsService } from "@/lib/services/logistics-service";
import { NotificationService } from "@/lib/services/notification-service";

describe("Phase 9: Delivery, Logistics, Tracking & OTP Test Suite", () => {
  it("validates state machine transitions for order fulfillment", () => {
    expect(canTransitionOrderStatus("pending_payment", "paid")).toBe(true);
    expect(canTransitionOrderStatus("paid", "processing")).toBe(true);
    expect(canTransitionOrderStatus("processing", "shipped")).toBe(true);
    expect(canTransitionOrderStatus("shipped", "completed")).toBe(true);

    // Invalid backwards transitions
    expect(canTransitionOrderStatus("completed", "processing")).toBe(false);
    expect(canTransitionOrderStatus("cancelled", "paid")).toBe(false);
  });

  it("validates delivery state machine transitions", () => {
    expect(canTransitionDeliveryStatus("not_assigned", "assigned")).toBe(true);
    expect(canTransitionDeliveryStatus("assigned", "accepted")).toBe(true);
    expect(canTransitionDeliveryStatus("accepted", "picked_up")).toBe(true);
    expect(canTransitionDeliveryStatus("picked_up", "in_transit")).toBe(true);
    expect(canTransitionDeliveryStatus("in_transit", "delivered")).toBe(true);

    // Invalid delivery transitions
    expect(canTransitionDeliveryStatus("delivered", "picked_up")).toBe(false);
  });

  it("generates a valid 6-digit numeric OTP code", () => {
    const otp = generateDeliveryOTP();
    expect(otp).toBeDefined();
    expect(otp.length).toBe(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it("calculates delivery fee accurately according to delivery zones and distance", () => {
    const huamboFee = LogisticsService.calculateDeliveryFee("Huambo", 15);
    expect(huamboFee.fee).toBeGreaterThan(2000);
    expect(huamboFee.zoneName).toContain("Huambo");

    const defaultFee = LogisticsService.calculateDeliveryFee();
    expect(defaultFee.fee).toBe(2500);
  });

  it("records tracking events and fetches audit trail", async () => {
    const eventsBefore = await LogisticsService.getOrderTrackingEvents("AGC-2026-000001");
    expect(eventsBefore.length).toBeGreaterThan(0);

    const newEvent = await LogisticsService.recordTrackingEvent({
      orderId: "ord-seed-1",
      orderNumber: "AGC-2026-000001",
      status: "in_transit",
      title: "Caminhão a Caminho",
      description: "Transportador iniciou deslocamento para o ponto de entrega.",
      actorName: "Expresso Rural Huambo",
      actorType: "courier",
    });

    expect(newEvent.id).toBeDefined();
    expect(newEvent.title).toBe("Caminhão a Caminho");

    const eventsAfter = await LogisticsService.getOrderTrackingEvents("AGC-2026-000001");
    expect(eventsAfter.length).toBe(eventsBefore.length + 1);
  });

  it("manages user notifications lifecycle", async () => {
    const notif = await NotificationService.createNotification({
      profileId: "test-user-1",
      type: "order.ready",
      title: "Pedido Pronto para Recolha",
      message: "O seu pedido está preparado para ser recolhido pelo transportador.",
      linkUrl: "/orders/AGC-2026-000001",
    });

    expect(notif.read).toBe(false);

    const success = await NotificationService.markAsRead(notif.id);
    expect(success).toBe(true);
    expect(notif.read).toBe(true);
  });

  it("handles courier assignment and OTP delivery validation", async () => {
    const assignResult = await LogisticsService.assignCourier({
      orderNumber: "AGC-2026-000001",
      sellerId: "prov-seed-1",
      courierId: "cour-1",
    });

    expect(assignResult.success).toBe(true);
    expect(assignResult.courier.company_name).toContain("Expresso Rural");

    // Test correct OTP delivery completion
    const completeResult = await LogisticsService.updateCourierDeliveryStatus({
      orderNumber: "AGC-2026-000001",
      sellerId: "prov-seed-1",
      courierId: "cour-1",
      nextDeliveryStatus: "delivered",
      otpCode: "483921",
    });

    expect(completeResult.success).toBe(true);
  });
});
