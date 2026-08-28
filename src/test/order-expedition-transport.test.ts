import { describe, expect, it } from "vitest";
import { getDictionary } from "@/i18n";
import {
  buildOrderExpeditionMessage,
  buildOrderExpeditionMetadata,
  canSellerExpedirGroup,
  isActiveOrderTransportRequestStatus,
  isBlockingOrderTransportStatus,
  isMissingSchemaError,
  isOrderExpeditionSource,
  isOrderGroupEligibleForExpedition,
  mapTransportRequestStatusToOrderTransport,
  matchesPublishedTransportQuery,
  ORDER_EXPEDITION_REQUEST_SOURCE,
  preferredTransportPrice,
  shouldShipOnTransportComplete,
  shouldBlockSelfTransportRequest,
  withoutOrderLinkColumns,
} from "@/lib/transport/order-expedition";
import { buildTransportRequestInsert } from "@/lib/transport/transport-request-lifecycle";
import type { TransportListItem } from "@/types/transport";

const publishedTransport: TransportListItem = {
  id: "11111111-1111-4111-8111-111111111111",
  provider_id: "22222222-2222-4222-8222-222222222222",
  provider_name: "ABC Transportes",
  provider_slug: "abc-transportes",
  provider_verified: true,
  title: "Transporte Agrícola Lobito → Luanda",
  slug: "transporte-agricola-lobito-luanda",
  origin_label: "Lobito",
  destination_label: "Luanda",
  vehicle_name: "Camião 10T",
  capacity_load: "10 toneladas",
  price_per_trip: 180000,
  price_per_load: 0,
  currency: "AOA",
  status: "published",
  created_at: new Date().toISOString(),
};

describe("Order expedition transport integration", () => {
  it("keeps standalone request inserts free of order-link columns", () => {
    const row = buildTransportRequestInsert({
      customerId: "cust-1",
      transport: publishedTransport,
      message: "Levar 20 sacos de milho",
    });

    expect(row.provider_id).toBe(publishedTransport.provider_id);
    expect(row.status).toBe("pending");
    expect(row).not.toHaveProperty("order_id");
    expect(row).not.toHaveProperty("seller_group_id");
    expect(row).not.toHaveProperty("request_source");
  });

  it("attaches order context only when the expedition wrapper supplies it", () => {
    const row = buildTransportRequestInsert({
      customerId: "seller-profile-1",
      transport: publishedTransport,
      message: "Pedido de transporte para a encomenda #AGC-000123.",
      orderId: "33333333-3333-4333-8333-333333333333",
      sellerGroupId: "44444444-4444-4444-8444-444444444444",
      requestSource: ORDER_EXPEDITION_REQUEST_SOURCE,
    });

    expect(row.order_id).toBe("33333333-3333-4333-8333-333333333333");
    expect(row.seller_group_id).toBe("44444444-4444-4444-8444-444444444444");
    expect(row.request_source).toBe("order_expedition");
    expect(row.provider_id).toBe(publishedTransport.provider_id);
    expect(row.status).toBe("pending");
  });

  it("does not treat sending or accepting a request as shipped", () => {
    expect(mapTransportRequestStatusToOrderTransport("pending")).toBe("requested");
    expect(mapTransportRequestStatusToOrderTransport("accepted")).toBe("accepted");
    expect(shouldShipOnTransportComplete("processing")).toBe(true);
    expect(shouldShipOnTransportComplete("shipped")).toBe(false);
    expect(shouldShipOnTransportComplete("completed")).toBe(false);
  });

  it("marks the order group shipped only after transport completion", () => {
    expect(mapTransportRequestStatusToOrderTransport("completed")).toBe("completed");
    expect(shouldShipOnTransportComplete("processing")).toBe(true);
    expect(shouldShipOnTransportComplete("ready_for_pickup")).toBe(true);
  });

  it("blocks a second active request and allows expedite after rejection", () => {
    expect(isActiveOrderTransportRequestStatus("pending")).toBe(true);
    expect(isActiveOrderTransportRequestStatus("accepted")).toBe(true);
    expect(isActiveOrderTransportRequestStatus("rejected")).toBe(false);
    expect(isBlockingOrderTransportStatus("requested")).toBe(true);
    expect(isBlockingOrderTransportStatus("accepted")).toBe(true);
    expect(isBlockingOrderTransportStatus("rejected")).toBe(false);

    expect(
      isOrderGroupEligibleForExpedition({
        orderStatus: "paid",
        groupStatus: "processing",
        transportStatus: "requested",
      }).ok
    ).toBe(false);

    expect(
      canSellerExpedirGroup({
        orderStatus: "paid",
        groupStatus: "processing",
        transportStatus: "rejected",
      })
    ).toBe(true);

    expect(
      canSellerExpedirGroup({
        orderStatus: "cancelled",
        groupStatus: "processing",
        transportStatus: null,
      })
    ).toBe(false);
  });

  it("builds an order expedition message from existing order data only", () => {
    const message = buildOrderExpeditionMessage({
      orderNumber: "AGC-000123",
      items: [{ quantity: 12, product_title: "Fertilizante NPK" }],
      destination: "Luanda",
    });

    expect(message).toContain("#AGC-000123");
    expect(message).toContain("12 × Fertilizante NPK");
    expect(message).toContain("Luanda");
    expect(message).not.toContain("undefined");
  });

  it("filters published transport cards by title, provider, origin, and destination", () => {
    expect(matchesPublishedTransportQuery(publishedTransport, "lobito")).toBe(true);
    expect(matchesPublishedTransportQuery(publishedTransport, "ABC")).toBe(true);
    expect(matchesPublishedTransportQuery(publishedTransport, "Huambo")).toBe(false);
    expect(preferredTransportPrice(publishedTransport)).toEqual({ amount: 180000, unit: "trip" });
  });

  it("keeps order_expedition as an optional request source", () => {
    expect(isOrderExpeditionSource("order_expedition")).toBe(true);
    expect(isOrderExpeditionSource(null)).toBe(false);
    expect(isOrderExpeditionSource("manual")).toBe(false);
  });

  it("falls back when order-link columns are not in the live schema yet", () => {
    expect(isMissingSchemaError({ code: "PGRST204", message: "Could not find the seller_group_id column" })).toBe(
      true
    );
    expect(isMissingSchemaError({ code: "42703", message: 'column "seller_group_id" does not exist' })).toBe(true);
    expect(isMissingSchemaError({ code: "42501", message: "permission denied" })).toBe(false);

    const row = withoutOrderLinkColumns({
      customer_id: "cust-1",
      order_id: "ord-1",
      seller_group_id: "grp-1",
      request_source: "order_expedition",
      metadata: buildOrderExpeditionMetadata({
        orderId: "ord-1",
        sellerGroupId: "grp-1",
        orderNumber: "AGC-000123",
      }),
    });
    expect(row).not.toHaveProperty("order_id");
    expect(row).not.toHaveProperty("seller_group_id");
    expect(row).not.toHaveProperty("request_source");
    expect(row.metadata).toEqual({
      order_id: "ord-1",
      seller_group_id: "grp-1",
      request_source: "order_expedition",
      order_number: "AGC-000123",
    });
  });

  it("stores order linkage in metadata even for the column-backed insert", () => {
    const row = buildTransportRequestInsert({
      customerId: "seller-profile-1",
      transport: publishedTransport,
      message: "Pedido de transporte para a encomenda #AGC-000123.",
      orderId: "33333333-3333-4333-8333-333333333333",
      sellerGroupId: "44444444-4444-4444-8444-444444444444",
      requestSource: ORDER_EXPEDITION_REQUEST_SOURCE,
      metadata: buildOrderExpeditionMetadata({
        orderId: "33333333-3333-4333-8333-333333333333",
        sellerGroupId: "44444444-4444-4444-8444-444444444444",
        orderNumber: "AGC-000123",
      }),
    });
    expect(row.metadata?.request_source).toBe("order_expedition");
    expect(row.metadata?.order_number).toBe("AGC-000123");
  });

  it("lets a seller use their own published fleet for order expedition, but not for marketplace booking", () => {
    const ownProviderId = publishedTransport.provider_id;
    expect(
      shouldBlockSelfTransportRequest({
        actorProviderIds: [ownProviderId],
        transportProviderId: ownProviderId,
      })
    ).toBe(true);
    expect(
      shouldBlockSelfTransportRequest({
        requestSource: ORDER_EXPEDITION_REQUEST_SOURCE,
        actorProviderIds: [ownProviderId],
        transportProviderId: ownProviderId,
      })
    ).toBe(false);
    expect(
      shouldBlockSelfTransportRequest({
        requestSource: ORDER_EXPEDITION_REQUEST_SOURCE,
        actorProviderIds: [ownProviderId],
        transportProviderId: "55555555-5555-4555-8555-555555555555",
      })
    ).toBe(false);
  });

  it("exposes PT/EN/FR copy for the expedition selector", () => {
    const pt = getDictionary("pt");
    const en = getDictionary("en");
    const fr = getDictionary("fr");

    expect(pt.dashboardOrders.chooseTransport).toBe("Escolher transporte");
    expect(pt.dashboardOrders.sendTransportRequest).toBe("Enviar pedido");
    expect(pt.dashboardOrders.waitingTransportAcceptance).toBe("A aguardar aceitação");
    expect(pt.dashboardOrders.activeTransportRequest).toBe(
      "Este pedido já possui um pedido de transporte ativo."
    );
    expect(en.dashboardOrders.chooseTransport).toBe("Choose transport");
    expect(en.dashboardOrders.noPublishedTransports).toBe("No transport available");
    expect(fr.dashboardOrders.chooseTransport).toBe("Choisir un transport");
    expect(fr.dashboardOrders.selectAnotherTransport).toContain("autre transport");
  });
});
