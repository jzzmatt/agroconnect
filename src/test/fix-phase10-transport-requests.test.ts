import { describe, it, expect } from "vitest";
import { getDashboardNavigation } from "@/config/navigation";
import { getDictionary } from "@/i18n";
import {
  buildTransportRequestInsert,
  canActorChangeTransportRequestStatus,
  canTransitionTransportRequestStatus,
  isTransportServiceId,
  isVisibleOnSendingRequests,
  requirePersistedRequestId,
  resolveTransportRequestActor,
  transportRequestDisplayStatus,
} from "@/lib/transport/transport-request-lifecycle";
import { can, subjectFromProfile } from "@/lib/authorization";
import type { TransportListItem } from "@/types/transport";

const publishedTransport: TransportListItem = {
  id: "11111111-1111-4111-8111-111111111111",
  provider_id: "22222222-2222-4222-8222-222222222222",
  provider_name: "Transportador Teste",
  provider_slug: "transportador-teste",
  provider_verified: true,
  title: "Rota Luanda Benguela",
  slug: "rota-luanda-benguela",
  origin_label: "Luanda",
  destination_label: "Benguela",
  vehicle_name: "Kia Canter",
  price_per_trip: 120000,
  price_per_load: 60000,
  currency: "AOA",
  status: "published",
  created_at: new Date().toISOString(),
};

describe("Fix-Phase-10 — Transport Service Requests", () => {
  it("never reports success without a persisted request id", () => {
    expect(requirePersistedRequestId(null, { message: "insert failed" }).ok).toBe(false);
    expect(requirePersistedRequestId({ id: "" }, null).ok).toBe(false);
    expect(requirePersistedRequestId({ id: "trq-fake" }, { message: "boom" }).ok).toBe(false);

    const persisted = requirePersistedRequestId(
      { id: "33333333-3333-4333-8333-333333333333" },
      null
    );
    expect(persisted.ok).toBe(true);
    if (persisted.ok) {
      expect(persisted.requestId).toBe("33333333-3333-4333-8333-333333333333");
    }
  });

  it("resolves transporter identity from the published transport service, not a client id", () => {
    const row = buildTransportRequestInsert({
      customerId: "cust-1",
      transport: publishedTransport,
      message: "Levar 20 sacos de milho",
      originNotes: "Porto de Luanda",
    });

    expect(row.provider_id).toBe(publishedTransport.provider_id);
    expect(row.transport_service_id).toBe(publishedTransport.id);
    expect(row.status).toBe("pending");
    expect(row.estimated_trip_price).toBe(120000);
    expect(row.origin_notes).toBe("Porto de Luanda");
    expect(row.destination_notes).toBe("Benguela");
    expect(row).not.toHaveProperty("clientProviderId");
  });

  it("rejects seed or non-uuid transport ids so fake catalogue rows cannot persist", () => {
    expect(isTransportServiceId("trn-seed-1")).toBe(false);
    expect(isTransportServiceId(publishedTransport.id)).toBe(true);
  });

  it("treats acceptance as confirmed booking immediately", () => {
    expect(canTransitionTransportRequestStatus("pending", "accepted")).toBe(true);
    expect(transportRequestDisplayStatus("accepted")).toBe("confirmed");
    expect(transportRequestDisplayStatus("pending")).toBe("pending");
  });

  it("enforces request authorization for requester, transporter, and other users", () => {
    expect(
      canActorChangeTransportRequestStatus({ actor: "other", from: "pending", to: "accepted" })
    ).toBe(false);
    expect(
      canActorChangeTransportRequestStatus({ actor: "requester", from: "pending", to: "accepted" })
    ).toBe(false);
    expect(
      canActorChangeTransportRequestStatus({ actor: "requester", from: "pending", to: "cancelled" })
    ).toBe(true);
    expect(
      canActorChangeTransportRequestStatus({ actor: "transporter", from: "pending", to: "accepted" })
    ).toBe(true);
    expect(
      canActorChangeTransportRequestStatus({ actor: "transporter", from: "pending", to: "rejected" })
    ).toBe(true);
    expect(
      canActorChangeTransportRequestStatus({
        actor: "transporter",
        from: "accepted",
        to: "completed",
      })
    ).toBe(true);
    expect(
      canActorChangeTransportRequestStatus({ actor: "requester", from: "accepted", to: "completed" })
    ).toBe(false);
    expect(canTransitionTransportRequestStatus("rejected", "accepted")).toBe(false);
    expect(canTransitionTransportRequestStatus("accepted", "pending")).toBe(false);
  });

  it("classifies actors from authenticated identities", () => {
    expect(
      resolveTransportRequestActor({
        profileId: "cust-1",
        providerId: null,
        customerId: "cust-1",
        requestProviderId: "prov-1",
      })
    ).toBe("requester");
    expect(
      resolveTransportRequestActor({
        profileId: "other",
        providerId: "prov-1",
        customerId: "cust-1",
        requestProviderId: "prov-1",
      })
    ).toBe("transporter");
    expect(
      resolveTransportRequestActor({
        profileId: "stranger",
        providerId: "prov-other",
        customerId: "cust-1",
        requestProviderId: "prov-1",
      })
    ).toBe("other");
  });

  it("adds receiving and sending request routes to the dashboard sidebar", () => {
    const pt = getDictionary("pt");
    const en = getDictionary("en");
    const nav = getDashboardNavigation(pt);
    const section = nav.find((item) => item.title === pt.navDash.transportServiceRequests);
    expect(section).toBeDefined();
    expect(section?.items.map((item) => item.href)).toEqual([
      "/dashboard/transport/requests/receiving",
      "/dashboard/transport/requests/sending",
    ]);
    expect(en.navDash.transportServiceRequests).toBe("Transport Service Requests");
    expect(en.navDash.receivingRequests).toBe("Receiving Requests");
    expect(en.navDash.sendingRequests).toBe("Sending Requests");
    expect(en.transportRequests.receivingEmpty).toBe("No transport requests received yet.");
    expect(en.transportRequests.sendingEmpty).toBe("You have not sent any transport requests yet.");
    expect(section?.items[0]?.requiredPermission).toBe("service.manage");
    expect(section?.items[0]?.neverLock).toBeUndefined();
    expect(section?.items[1]?.neverLock).toBe(true);
  });

  it("locks receiving requests behind service.manage and keeps sending requests available", () => {
    const basic = subjectFromProfile({
      id: "p-basic",
      clerk_user_id: "clerk-basic",
      roles: ["student"],
      account_type: "customer",
      subscription_plan: "basic",
      subscription_status: "active",
    });
    const professional = subjectFromProfile({
      id: "p-pro",
      clerk_user_id: "clerk-pro",
      roles: ["student"],
      account_type: "customer",
      subscription_plan: "professional",
      subscription_status: "active",
    });
    const business = subjectFromProfile({
      id: "p-biz",
      clerk_user_id: "clerk-biz",
      roles: ["student"],
      account_type: "customer",
      subscription_plan: "business",
      subscription_status: "active",
    });
    const enterprise = subjectFromProfile({
      id: "p-ent",
      clerk_user_id: "clerk-ent",
      roles: ["student"],
      account_type: "customer",
      subscription_plan: "enterprise",
      subscription_status: "active",
    });
    const unsubscribed = subjectFromProfile({
      id: "p-none",
      clerk_user_id: "clerk-none",
      roles: ["student"],
      account_type: "customer",
      subscription_plan: null,
      subscription_status: "active",
    });

    expect(can(basic, "service.manage")).toBe(false);
    expect(can(unsubscribed, "service.manage")).toBe(false);
    expect(can(professional, "service.manage")).toBe(true);
    expect(can(business, "service.manage")).toBe(true);
    expect(can(enterprise, "service.manage")).toBe(true);
  });

  it("removes cancelled requests from the sending list", () => {
    expect(isVisibleOnSendingRequests("pending")).toBe(true);
    expect(isVisibleOnSendingRequests("accepted")).toBe(true);
    expect(isVisibleOnSendingRequests("rejected")).toBe(true);
    expect(isVisibleOnSendingRequests("completed")).toBe(true);
    expect(isVisibleOnSendingRequests("cancelled")).toBe(false);
  });
});
