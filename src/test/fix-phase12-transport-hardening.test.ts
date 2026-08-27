import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { can, subjectFromProfile } from "@/lib/authorization";
import { getDictionary } from "@/i18n";
import {
  collectForbiddenTransportCommerceKeys,
  isTransportPaymentEnabled,
} from "@/lib/transport/transport-booking-boundary";
import {
  canReadTransportRequestAs,
  isOpenPendingDuplicate,
  resolveTransportRequestActor,
  resolveTransportRequestStatusChange,
  transportRequestDisplayStatus,
  transportRequestStatusLock,
} from "@/lib/transport/transport-request-lifecycle";

const MIGRATION = "supabase/migrations/20260827000006_041_fix_phase12_transport_hardening.sql";

function profile(plan: "basic" | "professional" | null, id: string) {
  return subjectFromProfile({
    id,
    clerk_user_id: `clerk-${id}`,
    roles: ["student"],
    account_type: "customer",
    subscription_plan: plan,
    subscription_status: "active",
  });
}

describe("Fix-Phase-12 — Transport request production hardening", () => {
  it("authorizes reads only for the requester or assigned transporter", () => {
    expect(canReadTransportRequestAs("other")).toBe(false);
    expect(canReadTransportRequestAs("requester")).toBe(true);
    expect(canReadTransportRequestAs("transporter")).toBe(true);

    expect(
      resolveTransportRequestActor({
        profileId: "cust-a",
        providerId: null,
        customerId: "cust-b",
        requestProviderId: "prov-a",
      })
    ).toBe("other");
    expect(
      resolveTransportRequestActor({
        profileId: "driver-a",
        providerId: "prov-a",
        customerId: "cust-a",
        requestProviderId: "prov-b",
      })
    ).toBe("other");
  });

  it("blocks unauthenticated-equivalent and wrong-role mutations", () => {
    expect(
      resolveTransportRequestStatusChange({ actor: "other", from: "pending", to: "accepted" })
    ).toEqual({ ok: false, reason: "unauthorized" });
    expect(
      resolveTransportRequestStatusChange({ actor: "requester", from: "pending", to: "accepted" })
    ).toEqual({ ok: false, reason: "unauthorized" });
    expect(
      resolveTransportRequestStatusChange({ actor: "requester", from: "pending", to: "rejected" })
    ).toEqual({ ok: false, reason: "unauthorized" });
    expect(
      resolveTransportRequestStatusChange({ actor: "requester", from: "accepted", to: "cancelled" })
    ).toEqual({ ok: false, reason: "unauthorized" });
    expect(can(profile(null, "none"), "service.manage")).toBe(false);
    expect(can(profile("basic", "basic"), "service.manage")).toBe(false);
    expect(can(profile("professional", "pro"), "service.manage")).toBe(true);
  });

  it("locks atomic status updates to the authenticated requester or transporter", () => {
    expect(
      transportRequestStatusLock({ actor: "other", providerId: "prov-1", profileId: "cust-1" })
    ).toBeNull();
    expect(
      transportRequestStatusLock({ actor: "transporter", providerId: "prov-1", profileId: "cust-1" })
    ).toEqual({ column: "provider_id", value: "prov-1" });
    expect(
      transportRequestStatusLock({ actor: "requester", providerId: null, profileId: "cust-1" })
    ).toEqual({ column: "customer_id", value: "cust-1" });
  });

  it("rejects repeated pending submits and duplicate acceptance", () => {
    expect(
      isOpenPendingDuplicate({
        customerId: "cust-1",
        transportServiceId: "svc-1",
        existing: [{ customer_id: "cust-1", transport_service_id: "svc-1", status: "pending" }],
      })
    ).toBe(true);
    expect(
      isOpenPendingDuplicate({
        customerId: "cust-1",
        transportServiceId: "svc-1",
        existing: [{ customer_id: "cust-1", transport_service_id: "svc-1", status: "accepted" }],
      })
    ).toBe(false);
    expect(
      resolveTransportRequestStatusChange({ actor: "transporter", from: "accepted", to: "accepted" })
    ).toEqual({ ok: false, reason: "conflict" });
    expect(transportRequestDisplayStatus("accepted")).toBe("confirmed");
    expect(isTransportPaymentEnabled()).toBe(false);
  });

  it("hardens RLS, insert price snap, and status-only updates in SQL", () => {
    expect(existsSync(MIGRATION)).toBe(true);
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("enforce_transport_request_insert");
    expect(sql).toContain("NEW.provider_id := svc.provider_id");
    expect(sql).toContain("NEW.estimated_trip_price := svc.price_per_trip");
    expect(sql).toContain("only the requester can cancel a pending transport request");
    expect(sql).toContain("only the assigned transporter can accept or reject");
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain("idx_transport_requests_one_pending_per_service");
    expect(sql).toContain("identity, notes, and pricing cannot be changed");
  });

  it("keeps dashboard lists on persisted state and notifies only after DB success", () => {
    const actions = readFileSync("src/lib/transport/transport-actions.ts", "utf8");
    const panel = readFileSync("src/components/transport/TransportRequestsPanel.tsx", "utf8");
    expect(actions).not.toMatch(/localStorage|sessionStorage/);
    expect(panel).not.toMatch(/localStorage|sessionStorage/);
    expect(actions).not.toContain('.select("*")');
    expect(actions).toContain("isOpenPendingDuplicate");
    expect(actions).toContain("notifyTransportRequest");
    expect(actions.indexOf("requirePersistedRequestId")).toBeLessThan(actions.indexOf("notifyTransportRequest({"));
    expect(actions.indexOf("if (error || !updated?.id)")).toBeLessThan(
      actions.indexOf("Pedido de transporte ${statusLabel}")
    );
    expect(actions).toContain("notification failed");
  });

  it("strips private and commerce fields from transport booking payloads", () => {
    expect(
      collectForbiddenTransportCommerceKeys({
        status: "accepted",
        email: "a@b.ao",
        clerk_user_id: "user_1",
        subscription_plan: "professional",
        order_id: "ord-1",
      })
    ).toEqual(expect.arrayContaining(["email", "clerk_user_id", "subscription_plan", "order_id"]));
  });

  it("exposes load/empty hardening copy for receiving and sending", () => {
    const pt = getDictionary("pt");
    const en = getDictionary("en");
    expect(pt.transportRequests.receivingEmptyHint.length).toBeGreaterThan(10);
    expect(pt.transportRequests.sendingEmptyHint.length).toBeGreaterThan(10);
    expect(pt.transportRequests.loadError).toMatch(/carregar/i);
    expect(en.transportRequests.loadError).toMatch(/load/i);
    expect(en.navDash.receivingRequests).toBe("Receiving Requests");
    expect(en.navDash.sendingRequests).toBe("Sending Requests");
  });
});
