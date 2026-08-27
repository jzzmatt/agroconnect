import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { can, subjectFromProfile } from "@/lib/authorization";
import { getDictionary } from "@/i18n";
import {
  collectForbiddenTransportCommerceKeys,
  isTransportPaymentEnabled,
  TRANSPORT_BOOKING_TABLE,
  TRANSPORT_PAYMENT_STATE,
  transportRequestStatusPatch,
} from "@/lib/transport/transport-booking-boundary";
import {
  groupTransportRequestsByDisplayStatus,
  resolveTransportRequestStatusChange,
  transportRequestDisplayStatus,
} from "@/lib/transport/transport-request-lifecycle";
import { INITIAL_ORDERS } from "@/lib/services/commerce-service";
import type { TransportRequestStatus } from "@/types/transport";

function profile(plan: "basic" | "professional" | null, id = "p-1") {
  return subjectFromProfile({
    id,
    clerk_user_id: `clerk-${id}`,
    roles: ["student"],
    account_type: "customer",
    subscription_plan: plan,
    subscription_status: "active",
  });
}

describe("Fix-Phase-11 — Transport booking / commerce boundary", () => {
  it("does not collect payment and keeps a single transport_requests booking record", () => {
    expect(isTransportPaymentEnabled()).toBe(false);
    expect(TRANSPORT_PAYMENT_STATE).toBe("coming_soon");
    expect(TRANSPORT_BOOKING_TABLE).toBe("transport_requests");
    expect(transportRequestStatusPatch("accepted")).toEqual({ status: "accepted" });
    expect(collectForbiddenTransportCommerceKeys(transportRequestStatusPatch("accepted"))).toEqual([]);
    expect(
      collectForbiddenTransportCommerceKeys({
        status: "accepted",
        order_id: "ord-1",
        payment_intent_id: "pi_1",
      })
    ).toEqual(["order_id", "payment_intent_id"]);
  });

  it("treats acceptance as confirmed booking immediately without a second order", () => {
    expect(transportRequestDisplayStatus("accepted")).toBe("confirmed");
    expect(INITIAL_ORDERS.some((order) => "transport_request_id" in order)).toBe(false);
  });

  it("prevents unauthenticated and wrong-owner mutations", () => {
    expect(
      resolveTransportRequestStatusChange({ actor: "other", from: "pending", to: "accepted" })
    ).toEqual({ ok: false, reason: "unauthorized" });
    expect(
      resolveTransportRequestStatusChange({ actor: "requester", from: "pending", to: "accepted" })
    ).toEqual({ ok: false, reason: "unauthorized" });
    expect(
      resolveTransportRequestStatusChange({ actor: "requester", from: "accepted", to: "completed" })
    ).toEqual({ ok: false, reason: "unauthorized" });
  });

  it("allows the assigned transporter to accept, reject, complete, or cancel a confirmed booking", () => {
    expect(
      resolveTransportRequestStatusChange({ actor: "transporter", from: "pending", to: "accepted" })
    ).toEqual({ ok: true });
    expect(
      resolveTransportRequestStatusChange({ actor: "transporter", from: "pending", to: "rejected" })
    ).toEqual({ ok: true });
    expect(
      resolveTransportRequestStatusChange({ actor: "transporter", from: "accepted", to: "completed" })
    ).toEqual({ ok: true });
    expect(
      resolveTransportRequestStatusChange({ actor: "transporter", from: "accepted", to: "cancelled" })
    ).toEqual({ ok: true });
    expect(
      resolveTransportRequestStatusChange({ actor: "requester", from: "pending", to: "cancelled" })
    ).toEqual({ ok: true });
  });

  it("rejects duplicate acceptance instead of creating a second booking", () => {
    const first = resolveTransportRequestStatusChange({
      actor: "transporter",
      from: "pending",
      to: "accepted",
    });
    const duplicate = resolveTransportRequestStatusChange({
      actor: "transporter",
      from: "accepted",
      to: "accepted",
    });
    expect(first).toEqual({ ok: true });
    expect(duplicate).toEqual({ ok: false, reason: "conflict" });
    expect(
      resolveTransportRequestStatusChange({ actor: "transporter", from: "rejected", to: "accepted" })
    ).toEqual({ ok: false, reason: "conflict" });
  });

  it("locks receiving-side mutations behind service.manage entitlement", () => {
    expect(can(profile(null, "p-none"), "service.manage")).toBe(false);
    expect(can(profile("basic"), "service.manage")).toBe(false);
    expect(can(profile("professional"), "service.manage")).toBe(true);
  });

  it("groups transporter bookings into pending, confirmed, completed, and cancelled", () => {
    const grouped = groupTransportRequestsByDisplayStatus([
      { id: "1", status: "pending" as TransportRequestStatus },
      { id: "2", status: "accepted" as TransportRequestStatus },
      { id: "3", status: "completed" as TransportRequestStatus },
      { id: "4", status: "cancelled" as TransportRequestStatus },
      { id: "5", status: "rejected" as TransportRequestStatus },
    ]);
    expect(grouped.pending.map((item) => item.id)).toEqual(["1"]);
    expect(grouped.confirmed.map((item) => item.id)).toEqual(["2"]);
    expect(grouped.completed.map((item) => item.id)).toEqual(["3"]);
    expect(grouped.cancelled.map((item) => item.id)).toEqual(["4"]);
    expect(grouped.rejected.map((item) => item.id)).toEqual(["5"]);
  });

  it("labels future payment as Coming Soon in PT/EN/FR", () => {
    expect(getDictionary("pt").transportRequests.confirmedBookings).toBe("Reservas confirmadas");
    expect(getDictionary("en").transportRequests.pendingRequests).toBe("Pending Requests");
    expect(getDictionary("en").transportRequests.confirmedBookings).toBe("Confirmed Bookings");
    expect(getDictionary("en").transportRequests.paymentComingSoon).toBe("Payment (Coming Soon)");
    expect(getDictionary("fr").transportRequests.paymentComingSoon).toMatch(/bientôt/i);
    expect(getDictionary("pt").transportRequests.paymentComingSoonHint).not.toMatch(/pagar agora/i);
  });

  it("keeps transport actions free of commerce/order/payment coupling", () => {
    const source = readFileSync("src/lib/transport/transport-actions.ts", "utf8");
    expect(source).not.toMatch(/commerce-service|commerce-actions|payment-service|createOrder|checkout/i);
    expect(source).toContain("transportRequestStatusPatch");
    expect(source).toContain("resolveTransportRequestStatusChange");
    expect(source).toContain("Este pedido já foi atualizado.");
  });
});
