import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/i18n/provider";
import { QrConnectModal } from "@/components/whatsapp/QrConnectModal";
import { WhatsAppIntegration } from "@/components/whatsapp/WhatsAppIntegration";

const QR = "data:image/png;base64,iVBORw0KGgo=";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WhatsApp QR display", () => {
  it("shows only a real QR image and keeps it inside the mobile dialog", () => {
    const { rerender } = render(
      <QrConnectModal
        open
        title="Ler o QR Code"
        help="Leia este código."
        waiting="A preparar o QR Code."
        expired="Se o código não for aceite, gere um novo QR Code."
        closeLabel="Fechar"
        regenerateLabel="Gerar novo QR Code"
        qrCode="javascript:alert(1)"
        busy={false}
        onClose={() => undefined}
        onRegenerate={() => undefined}
      />
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("A preparar o QR Code.")).toBeTruthy();

    rerender(
      <QrConnectModal
        open
        title="Ler o QR Code"
        help="Leia este código."
        waiting="A preparar o QR Code."
        expired="Se o código não for aceite, gere um novo QR Code."
        closeLabel="Fechar"
        regenerateLabel="Gerar novo QR Code"
        qrCode={QR}
        busy={false}
        onClose={() => undefined}
        onRegenerate={() => undefined}
      />
    );
    const image = screen.getByRole("img");
    expect(image.getAttribute("src")).toBe(QR);
    expect(image.className).toContain("max-w-[280px]");
    expect(image.className).toContain("w-full");
    expect(screen.getByText("Se o código não for aceite, gere um novo QR Code.")).toBeTruthy();
  });

  it("shows the connected number only after the server reports it", async () => {
    const connection = {
      status: "not_connected",
      phone: null,
      connectedAt: null,
      savedGroupCount: 0,
      updatedAt: null,
      qrVersion: 0,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/whatsapp/connection")) {
        return Response.json({ connection });
      }
      if (url.endsWith("/api/whatsapp/connect")) {
        return Response.json({
          connection: { ...connection, status: "qr_pending", qrVersion: 1 },
          qrCode: QR,
          pending: false,
        });
      }
      if (url.endsWith("/api/whatsapp/refresh")) {
        return Response.json({
          connection: {
            ...connection,
            status: "connected",
            phone: "+244923000111",
            connectedAt: "2026-11-06T10:05:00.000Z",
            qrVersion: 1,
          },
        });
      }
      if (url.endsWith("/api/whatsapp/groups")) {
        return Response.json({ groups: [] });
      }
      return Response.json({ error: "UNEXPECTED" }, { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <I18nProvider initialLocale="pt">
        <WhatsAppIntegration />
      </I18nProvider>
    );

    expect(await screen.findByText("Não conectado")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Conectar WhatsApp" }));
    expect(await screen.findByRole("img")).toHaveProperty("src", expect.stringContaining("data:image/png"));
    expect(screen.queryByText("+244923000111")).toBeNull();

    await waitFor(() => expect(screen.getByText("+244923000111")).toBeTruthy(), { timeout: 6000 });
    expect(initMethod(fetchMock, "/api/whatsapp/connect")).toBe("POST");
  });
});

function initMethod(fetchMock: ReturnType<typeof vi.fn>, suffix: string): string | undefined {
  const call = fetchMock.mock.calls.find((item) => String(item[0]).endsWith(suffix));
  return (call?.[1] as RequestInit | undefined)?.method;
}
