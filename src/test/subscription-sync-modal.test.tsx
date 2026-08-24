import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { SubscriptionSyncModal } from "@/components/subscription/SubscriptionSyncModal";
import { I18nProvider } from "@/i18n/provider";

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("SubscriptionSyncModal Component", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders synchronization progression steps and reaches 100% completion", async () => {
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

    expect(screen.getByText(/A sincronizar o seu plano Profissional/i)).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText(/O seu plano Profissional está pronto!/i)).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    expect(screen.getByRole("button", { name: /Terminar Sessão e Entrar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tentar novamente/i })).not.toBeInTheDocument();
  });

  it("renders error state when subscription activation endpoint fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: "Erro na base de dados",
        code: "PLAN_NOT_PERSISTED",
      }),
    } as any);

    render(
      <I18nProvider initialLocale="pt">
        <SubscriptionSyncModal isOpen={true} targetPlan="business" />
      </I18nProvider>
    );

    await waitFor(
      () => {
        expect(screen.getByText(/Erro na base de dados \(PLAN_NOT_PERSISTED\)/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByRole("button", { name: /Tentar novamente/i })).toBeInTheDocument();
  });

  it("fails verification when the stored plan does not match the selected plan", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        plan: "basic",
      }),
    } as any);

    render(
      <I18nProvider initialLocale="pt">
        <SubscriptionSyncModal isOpen={true} targetPlan="professional" />
      </I18nProvider>
    );

    await waitFor(
      () => {
        expect(screen.getByText(/não corresponde ao plano selecionado/i)).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    expect(
      screen.queryByRole("button", { name: /Terminar Sessão e Entrar/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tentar novamente/i })).toBeInTheDocument();
  });
});
