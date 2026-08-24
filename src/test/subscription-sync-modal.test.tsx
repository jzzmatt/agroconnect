import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SubscriptionSyncModal } from "@/components/subscription/SubscriptionSyncModal";
import { I18nProvider } from "@/i18n/provider";

// Mock clerk hooks
vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("SubscriptionSyncModal Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders synchronization progression steps and reaches 100% completion", async () => {
    // Mock global fetch for /api/subscription/activate
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        plan: "professional",
        entitlements: { can_access_agriproduct: true },
      }),
    } as any);

    render(
      <I18nProvider initialLocale="pt">
        <SubscriptionSyncModal isOpen={true} targetPlan="professional" />
      </I18nProvider>
    );

    // Initial loading title
    expect(screen.getByText(/A sincronizar o seu plano Profissional/i)).toBeInTheDocument();

    // Reaches completed state with the mandatory logout CTA
    await waitFor(
      () => {
        expect(screen.getByText(/O seu plano Profissional está pronto!/i)).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    expect(screen.getByRole("button", { name: /Terminar Sessão e Entrar/i })).toBeInTheDocument();
  });

  it("renders error state when subscription activation endpoint fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: "Erro na base de dados",
      }),
    } as any);

    render(
      <I18nProvider initialLocale="pt">
        <SubscriptionSyncModal isOpen={true} targetPlan="business" />
      </I18nProvider>
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Erro na base de dados/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByRole("button", { name: /Tentar novamente/i })).toBeInTheDocument();
  });
});
