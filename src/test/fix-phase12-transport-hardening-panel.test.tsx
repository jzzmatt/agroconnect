import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n/provider";
import { TransportRequestsPanel } from "@/components/transport/TransportRequestsPanel";
import type { TransportRequestItem } from "@/types/transport";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: true }),
}));

const sendingRequests: TransportRequestItem[] = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    customer_id: "cust-1",
    customer_name: "Ana",
    provider_id: "prov-1",
    provider_name: "Trans Angola",
    transport_title: "Luanda → Namibe",
    status: "accepted",
    origin: "Luanda",
    destination: "Namibe",
    vehicle_name: "Kia Canter",
    estimated_trip_price: 150000,
    currency: "AOA",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const getCustomerTransportRequestsAction = vi.fn();
const getTransportRequestsForProviderAction = vi.fn();

vi.mock("@/lib/transport/transport-actions", () => ({
  getTransportRequestsForProviderAction: (...args: unknown[]) =>
    getTransportRequestsForProviderAction(...args),
  getCustomerTransportRequestsAction: (...args: unknown[]) =>
    getCustomerTransportRequestsAction(...args),
  updateTransportRequestStatusAction: vi.fn(),
}));

describe("Fix-Phase-12 — dashboard request UI hardening", () => {
  beforeEach(() => {
    cleanup();
    getCustomerTransportRequestsAction.mockReset();
    getTransportRequestsForProviderAction.mockReset();
  });

  it("shows persisted confirmed bookings on Sending Requests after reload", async () => {
    getCustomerTransportRequestsAction.mockResolvedValue({ requests: sendingRequests, error: null });

    render(
      <I18nProvider initialLocale="pt">
        <TransportRequestsPanel view="sending" />
      </I18nProvider>
    );

    expect(await screen.findByRole("heading", { name: "Pedidos enviados" })).toBeInTheDocument();
    expect(screen.getByText("Luanda → Namibe")).toBeInTheDocument();
    expect(screen.getAllByText("Confirmado").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Pagamento (em breve)" })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "Pedidos pendentes" })).not.toBeInTheDocument();
  });

  it("shows a load error instead of an empty success state", async () => {
    getTransportRequestsForProviderAction.mockResolvedValue({
      requests: [],
      error: "Não foi possível carregar os pedidos de transporte.",
    });

    render(
      <I18nProvider initialLocale="pt">
        <TransportRequestsPanel view="receiving" />
      </I18nProvider>
    );

    expect(await screen.findByText("Não foi possível carregar os pedidos de transporte.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    expect(screen.queryByText("Ainda não recebeu pedidos de transporte.")).not.toBeInTheDocument();
  });
});
