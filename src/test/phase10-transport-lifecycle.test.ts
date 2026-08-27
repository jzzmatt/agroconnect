import { describe, it, expect } from "vitest";
import {
  assertTransportStatusTransition,
  canTransitionTransportStatus,
  isPubliclyVisibleTransportStatus,
  TRANSPORT_STATUS_TRANSITIONS,
} from "@/lib/transport/transport-lifecycle";
import {
  canPermanentlyDeleteTransport,
  deleteDialogForTransportStatus,
} from "@/lib/transport/transport-delete-flow";
import { validateTransportForPublication } from "@/lib/transport/transport-publication-validation";
import type { TransportListItem } from "@/types/transport";

function sampleTransport(
  overrides: Partial<TransportListItem> = {}
): TransportListItem {
  return {
    id: "trn-test",
    provider_id: "prov-1",
    title: "Trajeto Waku Luanda",
    slug: "trajeto-waku-luanda",
    short_description: "Trajeto Waku Luanda",
    description: "Transporte de carga",
    origin_label: "Waku Kungo",
    destination_label: "Luanda",
    vehicle_name: "Kia Canter",
    vehicle_type: null,
    vehicle_model: "2019",
    capacity_load: "5 toneladas",
    vehicle_media_url: null,
    vehicle_video_url: null,
    base_latitude: null,
    base_longitude: null,
    price_per_trip: 50000,
    price_per_load: 0,
    currency: "AOA",
    status: "draft",
    created_at: new Date().toISOString(),
    provider_name: "Transportador Teste",
    provider_slug: "transportador-teste",
    provider_verified: true,
    ...overrides,
  };
}

describe("AGROCONNECT Phase 10 — Transport lifecycle", () => {
  it("mirrors course-style publication transitions", () => {
    expect(TRANSPORT_STATUS_TRANSITIONS.draft).toEqual(["published", "archived"]);
    expect(TRANSPORT_STATUS_TRANSITIONS.published).toEqual(["paused", "archived"]);
    expect(TRANSPORT_STATUS_TRANSITIONS.paused).toEqual(["published", "draft", "archived"]);
    expect(TRANSPORT_STATUS_TRANSITIONS.archived).toEqual([]);
  });

  it("only treats published transports as publicly visible", () => {
    expect(isPubliclyVisibleTransportStatus("published")).toBe(true);
    expect(isPubliclyVisibleTransportStatus("draft")).toBe(false);
    expect(isPubliclyVisibleTransportStatus("paused")).toBe(false);
    expect(isPubliclyVisibleTransportStatus("archived")).toBe(false);
  });

  it("allows valid status transitions and rejects invalid ones", () => {
    expect(canTransitionTransportStatus("draft", "published")).toBe(true);
    expect(canTransitionTransportStatus("published", "paused")).toBe(true);
    expect(canTransitionTransportStatus("paused", "draft")).toBe(true);
    expect(canTransitionTransportStatus("published", "draft")).toBe(false);

    expect(() => assertTransportStatusTransition("published", "draft")).toThrow(
      /Transição de estado inválida/
    );
  });

  it("validates transport fields required for publication", () => {
    const valid = validateTransportForPublication(sampleTransport());
    expect(valid.ok).toBe(true);

    const missingTitle = validateTransportForPublication(sampleTransport({ title: "ab" }));
    expect(missingTitle.ok).toBe(false);
    if (!missingTitle.ok) {
      expect(missingTitle.errors.some((e) => e.includes("título"))).toBe(true);
    }

    const missingVehicle = validateTransportForPublication(sampleTransport({ vehicle_name: "" }));
    expect(missingVehicle.ok).toBe(false);

    const missingPrices = validateTransportForPublication(
      sampleTransport({ price_per_trip: 0, price_per_load: 0 })
    );
    expect(missingPrices.ok).toBe(false);

    const missingRoute = validateTransportForPublication(
      sampleTransport({ origin_label: "", destination_label: "" })
    );
    expect(missingRoute.ok).toBe(false);
  });

  it("blocks deletion of published transports until paused", () => {
    expect(canPermanentlyDeleteTransport("published")).toBe(false);
    expect(deleteDialogForTransportStatus("published")).toBe("published_block");

    expect(canPermanentlyDeleteTransport("draft")).toBe(true);
    expect(canPermanentlyDeleteTransport("paused")).toBe(true);
    expect(canPermanentlyDeleteTransport("archived")).toBe(true);
    expect(deleteDialogForTransportStatus("draft")).toBe("confirm_delete");
    expect(deleteDialogForTransportStatus("archived")).toBe("confirm_delete");
  });
});
