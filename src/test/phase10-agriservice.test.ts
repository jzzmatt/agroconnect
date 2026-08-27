import { describe, it, expect } from "vitest";
import { ExpertDiscoveryService } from "@/lib/agriservice/expert-discovery";
import {
  TransportService,
  INITIAL_TRANSPORT_SERVICES,
} from "@/lib/transport/transport-service";

describe("AGROCONNECT Phase 10 — AgriService", () => {
  it("1. lists published experts from seed fallback", async () => {
    const { experts, total } = await ExpertDiscoveryService.searchPublishedExperts();
    expect(total).toBeGreaterThan(0);
    expect(experts[0].slug).toBeTruthy();
    expect(experts[0].name).toBeTruthy();
  });

  it("2. filters experts by province", async () => {
    const { experts } = await ExpertDiscoveryService.searchPublishedExperts({
      provinceName: "Huambo",
    });
    expect(experts.every((e) => e.provinceName.toLowerCase() === "huambo")).toBe(true);
  });

  it("3. discovers published transport services", async () => {
    const { transports, total } = await TransportService.searchPublishedTransports();
    expect(total).toBeGreaterThan(0);
    expect(transports.every((t) => t.status === "published")).toBe(true);
  });

  it("4. retrieves transport detail by slug with dual pricing", async () => {
    const slug = INITIAL_TRANSPORT_SERVICES[0].slug;
    const transport = await TransportService.getTransportBySlug(slug);
    expect(transport).not.toBeNull();
    expect(transport?.price_per_trip).toBeGreaterThan(0);
    expect(transport?.price_per_load).toBeGreaterThan(0);
    expect(transport?.vehicle_name).toBeTruthy();
  });

  it("5. filters transport by origin province", async () => {
    const { transports } = await TransportService.searchPublishedTransports({
      originProvinceName: "Luanda",
    });
    expect(transports.length).toBeGreaterThan(0);
    expect(
      transports.some(
        (t) =>
          t.origin_province_name?.toLowerCase() === "luanda" ||
          t.origin_label?.toLowerCase().includes("luanda")
      )
    ).toBe(true);
  });

  it("6. returns provider transport listings for aggregation", async () => {
    const providerId = INITIAL_TRANSPORT_SERVICES[0].provider_id;
    const transports = await TransportService.getProviderTransports(providerId, true);
    expect(transports.length).toBeGreaterThan(0);
    expect(transports.every((t) => t.provider_id === providerId)).toBe(true);
  });

  it("7. maps transport request rows with lifecycle status", () => {
    const mapped = TransportService.mapRequestRow({
      id: "req-1",
      customer_id: "cust-1",
      provider_id: "prov-1",
      transport_service_id: "trn-1",
      status: "pending",
      message: "Transportar 20 cabeças de gado",
      origin_notes: "Luanda Porto",
      destination_notes: null,
      estimated_trip_price: 120000,
      currency: "AOA",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profiles: { display_name: "Cliente Teste" },
      provider_profiles: { business_name: "Transportador Teste" },
      transport_services: {
        title: "Rota Teste",
        slug: "rota-teste",
        origin_label: "Luanda",
        destination_label: "Benguela",
        vehicle_name: "Kia Canter",
        vehicle_type: "Camião",
        vehicle_model: "2020",
        capacity_load: "5 toneladas",
      },
    });

    expect(mapped.status).toBe("pending");
    expect(mapped.customer_name).toBe("Cliente Teste");
    expect(mapped.transport_title).toBe("Rota Teste");
    expect(mapped.origin).toBe("Luanda Porto");
    expect(mapped.destination).toBe("Benguela");
    expect(mapped.vehicle_name).toBe("Kia Canter");
    expect(mapped.estimated_trip_price).toBe(120000);
  });
});
