import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n/provider";
import { TransportRequestsPanel } from "@/components/transport/TransportRequestsPanel";
import type { TransportRequestItem } from "@/types/transport";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: true }),
}));

const requests: TransportRequestItem[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    customer_id: "cust-1",
    customer_name: "Ana",
    provider_id: "prov-1",
    provider_name: "Trans Angola",
    transport_title: "Luanda → Benguela",
    status: "pending",
    origin: "Luanda",
    destination: "Benguela",
    vehicle_name: "Kia Canter",
    estimated_trip_price: 120000,
    currency: "AOA",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    customer_id: "cust-2",
    customer_name: "Mateus",
    provider_id: "prov-1",
    provider_name: "Trans Angola",
    transport_title: "Huambo → Luanda",
    status: "accepted",
    origin: "Huambo",
    destination: "Luanda",
    vehicle_name: "Mercedes Atego",
    estimated_trip_price: 90000,
    currency: "AOA",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

vi.mock("@/lib/transport/transport-actions", () => ({
  getTransportRequestsForProviderAction: vi.fn(async () => ({ requests, error: null })),
  getCustomerTransportRequestsAction: vi.fn(async () => ({ requests, error: null })),
  updateTransportRequestStatusAction: vi.fn(),
}));

describe("Fix-Phase-11 — transporter booking views", () => {
  beforeEach(() => {
    cleanup();
  });

  it("shows confirmed bookings grouped separately and a non-functional Coming Soon payment control", async () => {
    render(
      <I18nProvider initialLocale="pt">
        <TransportRequestsPanel view="receiving" />
      </I18nProvider>
    );

    expect(await screen.findByRole("heading", { name: "Pedidos pendentes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reservas confirmadas" })).toBeInTheDocument();
    expect(screen.getByText("Luanda → Benguela")).toBeInTheDocument();
    expect(screen.getByText("Huambo → Luanda")).toBeInTheDocument();
    expect(screen.getAllByText("Confirmado").length).toBeGreaterThan(0);

    const payment = screen.getByRole("button", { name: "Pagamento (em breve)" });
    expect(payment).toBeDisabled();
    expect(screen.getByText(/sem cobrança/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar reserva" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Concluir" })).toBeInTheDocument();
  });
});
