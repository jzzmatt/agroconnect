import { describe, it, expect } from "vitest";
import { getDashboardNavigation } from "@/config/navigation";
import { getDictionary } from "@/i18n";
import {
  buildTransportRequestInsert,
  canActorChangeTransportRequestStatus,
  canTransitionTransportRequestStatus,
  interpretTransportRequestStatusWrite,
  isTransportRequestStatusAlreadyApplied,
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

  it("treats an already-applied status write as success", () => {
    expect(isTransportRequestStatusAlreadyApplied("accepted", "accepted")).toBe(true);
    expect(isTransportRequestStatusAlreadyApplied("pending", "accepted")).toBe(false);
    expect(
      interpretTransportRequestStatusWrite({
        updatedId: "req-1",
        targetStatus: "accepted",
      }).ok
    ).toBe(true);
    expect(
      interpretTransportRequestStatusWrite({
        error: { message: "0 rows" },
        currentStatus: "accepted",
        targetStatus: "accepted",
      }).ok
    ).toBe(true);
    expect(
      interpretTransportRequestStatusWrite({
        error: { message: "record new has no field order_id" },
        targetStatus: "accepted",
      }).ok
    ).toBe(false);
    expect(
      interpretTransportRequestStatusWrite({
        currentStatus: "pending",
        targetStatus: "accepted",
      }).ok
    ).toBe(false);
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
    const fr = getDictionary("fr");
    const nav = getDashboardNavigation(pt);
    const agriService = nav.find((item) => item.title === "AgriService");
    expect(agriService).toBeDefined();
    expect(agriService?.items.map((item) => item.title)).toEqual([
      pt.navDash.myServices,
      pt.navDash.serviceRequests,
      pt.navDash.myTransport,
      pt.navDash.transportMessages,
      pt.navDash.reviews,
    ]);
    const messages = agriService?.items.find((item) => item.title === pt.navDash.transportMessages);
    expect(messages?.href).toBeUndefined();
    expect(messages?.children?.map((item) => item.href)).toEqual([
      "/dashboard/transport/requests/receiving",
      "/dashboard/transport/requests/sending",
    ]);
    const receiving = messages?.children?.find((item) => item.href === "/dashboard/transport/requests/receiving");
    const sending = messages?.children?.find((item) => item.href === "/dashboard/transport/requests/sending");
    expect(receiving?.icon).toBeDefined();
    expect(sending?.icon).toBeDefined();
    expect(en.navDash.myTransport).toBe("My Transport");
    expect(en.navDash.transportMessages).toBe("Transport Messages");
    expect(pt.navDash.myTransport).toBe("Meus Transportes");
    expect(pt.navDash.transportMessages).toBe("Mensagens de Transporte");
    expect(fr.navDash.myTransport).toBe("Mes Transports");
    expect(fr.navDash.transportMessages).toBe("Messages de Transport");
    expect(en.navDash.receivingRequests).toBe("Transport Receiving Requests");
    expect(en.navDash.sendingRequests).toBe("Transport Sending Requests");
    expect(pt.navDash.receivingRequests).toBe("Pedidos de Transporte Recebidos");
    expect(pt.navDash.sendingRequests).toBe("Pedidos de Transporte Enviados");
    expect(fr.navDash.receivingRequests).toBe("Demandes de Transport Reçues");
    expect(fr.navDash.sendingRequests).toBe("Demandes de Transport Envoyées");
    expect(en.transportRequests.receivingTitle).toBe("Transport Receiving Requests");
    expect(en.transportRequests.sendingTitle).toBe("Transport Sending Requests");
    expect(en.transportRequests.receivingEmpty).toBe("No transport requests received yet.");
    expect(en.transportRequests.sendingEmpty).toBe("You have not sent any transport requests yet.");
    expect(receiving?.requiredPermission).toBe("service.manage");
    expect(receiving?.neverLock).toBeUndefined();
    expect(sending?.neverLock).toBe(true);
    expect(nav.find((item) => item.title === pt.navDash.transportServiceRequests)).toBeUndefined();
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
