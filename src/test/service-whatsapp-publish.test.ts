import { readFileSync } from "node:fs";
import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServiceWhatsAppPublishModal } from "@/components/marketplace/ServiceWhatsAppPublishModal";
import { I18nProvider } from "@/i18n/provider";
import { resolveAuthRedirectUrl } from "@/lib/auth/redirect-url";
import { buildServiceWhatsappMessage, formatServicePrice } from "@/lib/whatsapp/service-message";
import {
  serviceBookingPath,
  serviceRequestOutcome,
  serviceSignInPath,
  serviceSignUpPath,
} from "@/lib/whatsapp/service-booking";
import {
  createServicePublishService,
  type ServiceShareConnection,
  type ServiceShareRecord,
  type ServiceShareStore,
  type ServiceTextSender,
  type ShareableService,
} from "@/lib/whatsapp/service-publish-service";
import { WhatsappServiceError } from "@/lib/whatsapp/types";

const GROUP_A = "120363000000000001@g.us";
const GROUP_B = "120363000000000002@g.us";
const FOREIGN = "120363000000000099@g.us";
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const SERVICE = "33333333-3333-4333-8333-333333333333";
const ORIGIN = "https://www.agroconnect.ao";

function item(patch: Partial<ShareableService> = {}): ShareableService {
  return {
    id: SERVICE,
    ownerUserId: USER,
    title: "Análise de solo",
    slug: "analise-de-solo",
    providerName: "Fazenda Huambo",
    description: "Amostras de solo e recomendação de correção.",
    price: 25000,
    currency: "AOA",
    pricingType: "hourly",
    provinceName: "Huambo",
    municipalityName: "Caála",
    status: "published",
    ...patch,
  };
}

function connection(): ServiceShareConnection {
  return { id: "conn-1", userId: USER, instanceId: "42", status: "connected", phone: "244900000000" };
}

function memoryStore(saved = item()) {
  const publications = new Map<string, ServiceShareRecord>();
  let sequence = 0;
  const store: ServiceShareStore = {
    async findConnection(userId) {
      return userId === USER ? connection() : null;
    },
    async listSavedGroups() {
      return [
        { id: GROUP_A, name: "Grupo 1", imageUrl: null, saved: true, available: true },
        { id: GROUP_B, name: "Grupo 2", imageUrl: null, saved: true, available: true },
      ];
    },
    async findService() {
      return saved;
    },
    async findPublicationByRequest(userId, clientRequestId) {
      return (
        [...publications.values()].find(
          (row) => row.userId === userId && row.clientRequestId === clientRequestId
        ) || null
      );
    },
    async latestPublicationAt(userId) {
      const rows = [...publications.values()].filter((row) => row.userId === userId);
      return rows.at(-1)?.createdAt || null;
    },
    async insertPublication(input) {
      if (
        [...publications.values()].some(
          (row) => row.userId === input.userId && row.clientRequestId === input.clientRequestId
        )
      ) {
        return "duplicate";
      }
      sequence += 1;
      const record: ServiceShareRecord = {
        id: `pub-${sequence}`,
        userId: input.userId,
        serviceId: input.serviceId,
        connectionId: input.connectionId,
        clientRequestId: input.clientRequestId,
        status: "processing",
        createdAt: "2026-11-10T09:00:00.000Z",
        targets: input.groups.map((group, index) => ({
          id: `target-${sequence}-${index}`,
          groupId: group.id,
          groupName: group.name,
          status: "pending",
          providerMessageId: null,
          errorCode: null,
          sentAt: null,
        })),
      };
      publications.set(record.id, record);
      return record;
    },
    async saveTarget(publicationId, target) {
      const record = publications.get(publicationId);
      if (!record) return;
      record.targets = record.targets.map((entry) => (entry.id === target.id ? target : entry));
    },
    async savePublicationStatus(publicationId, status) {
      const record = publications.get(publicationId);
      if (record) record.status = status;
    },
    async claimForRetry(_userId, publicationId) {
      const record = publications.get(publicationId);
      if (!record || (record.status !== "failed" && record.status !== "partially_sent")) return false;
      record.status = "processing";
      return true;
    },
    async findPublication(_userId, publicationId) {
      return publications.get(publicationId) || null;
    },
    async audit() {
      return undefined;
    },
  };
  return { store, service: saved };
}

function api(store: ServiceShareStore, sender: ServiceTextSender) {
  return createServicePublishService({
    store,
    sender,
    origin: ORIGIN,
    now: () => new Date("2026-11-10T10:00:00.000Z"),
  });
}

describe("service WhatsApp publishing", () => {
  it("builds a booking invitation with the service, provider, price, location, and links", () => {
    const message = buildServiceWhatsappMessage({
      title: "Análise de solo",
      providerName: "Fazenda Huambo",
      price: 25000,
      currency: "AOA",
      pricingType: "hourly",
      description: "Amostras de solo e recomendação de correção.",
      province: "Huambo",
      municipality: "Caála",
      bookingUrl: `${ORIGIN}${serviceBookingPath("analise-de-solo")}`,
      serviceUrl: `${ORIGIN}/services/analise-de-solo`,
    });
    expect(message).toContain("Análise de solo");
    expect(message).toContain("Fazenda Huambo");
    expect(message).toContain(formatServicePrice(25000, "AOA", "hourly"));
    expect(message).toContain("Huambo / Caála");
    expect(message).toContain("Amostras de solo");
    expect(message).toContain("https://www.agroconnect.ao/services/analise-de-solo?book=1");
    expect(message).toContain("https://www.agroconnect.ao/services/analise-de-solo\n");
    expect(message.toLowerCase()).not.toContain("confirmad");
    expect(formatServicePrice(0, "AOA", "quotation")).toBe("Preço sob consulta");
  });

  it("returns an unsigned recipient to the same service after sign-in or registration", () => {
    const booking = serviceBookingPath("analise-de-solo");
    expect(resolveAuthRedirectUrl(new URL(`https://www.agroconnect.ao${serviceSignInPath("analise-de-solo")}`).searchParams.get("redirect_url"))).toBe(booking);
    expect(resolveAuthRedirectUrl(new URL(`https://www.agroconnect.ao${serviceSignUpPath("analise-de-solo")}`).searchParams.get("redirect_url"))).toBe(booking);
    const page = readFileSync("src/app/services/[slug]/page.tsx", "utf8");
    expect(page).toContain("serviceSignInPath");
    expect(page).toContain('searchParams.get("book") === "1"');
    expect(page).not.toContain("createServiceRequestAction");
    const modal = readFileSync("src/components/marketplace/ServiceRequestModal.tsx", "utf8");
    expect(modal).toContain('serviceRequestOutcome(res) === "saved"');
    expect(modal).toContain("Pedido Enviado com Sucesso!");
    expect(modal).not.toContain("consulta confirmada");
    expect(serviceRequestOutcome({ success: true })).toBe("saved");
    expect(serviceRequestOutcome({ success: false })).toBe("incomplete");
    expect(serviceRequestOutcome(null)).toBe("incomplete");
    const action = readFileSync("src/lib/services/marketplace-actions.ts", "utf8");
    expect(action).toContain('status: "pending"');
  });

  it("previews saved groups for the owner and rejects another provider or a draft", async () => {
    const { store, service: saved } = memoryStore();
    const preview = await api(store, { sendText: vi.fn() }).preview(USER, SERVICE);
    expect(preview.groups.map((group) => group.name)).toEqual(["Grupo 1", "Grupo 2"]);
    expect(preview.service.bookingUrl).toContain("?book=1");
    expect(saved.status).toBe("published");
    await expect(api(memoryStore(item({ ownerUserId: OTHER })).store, { sendText: vi.fn() }).preview(USER, SERVICE)).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
    await expect(api(memoryStore(item({ status: "draft" })).store, { sendText: vi.fn() }).publish(USER, {
      serviceId: SERVICE,
      groupIds: [GROUP_A],
      clientRequestId: "request-service-0001",
    })).rejects.toBeInstanceOf(WhatsappServiceError);
  });

  it("does not resend a confirmed group when a later group fails and the owner retries", async () => {
    const { store, service: saved } = memoryStore();
    const calls: string[] = [];
    const sendText = vi.fn(async (_instance: string, chatId: string) => {
      calls.push(chatId);
      if (chatId === GROUP_B && calls.filter((id) => id === GROUP_B).length === 1) {
        throw new Error("waapi down");
      }
      return { messageId: `msg-${chatId}` };
    });
    const publisher = api(store, { sendText });
    const failed = await publisher.publish(USER, {
      serviceId: SERVICE,
      groupIds: [GROUP_A, GROUP_B],
      clientRequestId: "request-service-0002",
    });
    expect(failed.status).toBe("partially_sent");
    expect(saved.status).toBe("published");
    const repeated = await publisher.publish(USER, {
      serviceId: SERVICE,
      groupIds: [GROUP_A, GROUP_B],
      clientRequestId: "request-service-0002",
    });
    expect(repeated.id).toBe(failed.id);
    expect(calls).toHaveLength(2);
    await expect(
      publisher.publish(USER, {
        serviceId: SERVICE,
        groupIds: [FOREIGN],
        clientRequestId: "request-service-0003",
      })
    ).rejects.toMatchObject({ status: 404 });
    const retried = await publisher.retry(USER, failed.id);
    expect(retried.status).toBe("sent");
    expect(calls.filter((id) => id === GROUP_A)).toHaveLength(1);
    expect(calls.filter((id) => id === GROUP_B)).toHaveLength(2);
  });

  it("sends the saved thumbnail with the service message and skips it when none is saved", async () => {
    const withImage = memoryStore(item({ thumbnailUrl: "/api/services/33333333-3333-4333-8333-333333333333/thumbnail" }));
    const sendText = vi.fn(async () => ({ messageId: "text" }));
    const sendMedia = vi.fn(async () => ({ messageId: "media" }));
    const sent = await api(withImage.store, { sendText, sendMedia }).publish(USER, {
      serviceId: SERVICE,
      groupIds: [GROUP_A],
      clientRequestId: "request-service-thumb1",
    });
    expect(sent.status).toBe("sent");
    expect(sendText).not.toHaveBeenCalled();
    expect(sendMedia).toHaveBeenCalledWith(
      "42",
      GROUP_A,
      "https://www.agroconnect.ao/api/services/33333333-3333-4333-8333-333333333333/thumbnail",
      expect.stringContaining("Análise de solo")
    );
    const plain = vi.fn(async () => ({ messageId: "text" }));
    await api(memoryStore().store, { sendText: plain, sendMedia: vi.fn() }).publish(USER, {
      serviceId: SERVICE,
      groupIds: [GROUP_A],
      clientRequestId: "request-service-thumb2",
    });
    expect(plain).toHaveBeenCalled();
  });

  it("sends the text when the thumbnail cannot be delivered", async () => {
    const withImage = memoryStore(item({ thumbnailUrl: "/api/services/33333333-3333-4333-8333-333333333333/thumbnail" }));
    const sendText = vi.fn(async () => ({ messageId: "text" }));
    const sendMedia = vi.fn(async () => {
      throw new Error("media rejected");
    });
    const sent = await api(withImage.store, { sendText, sendMedia }).publish(USER, {
      serviceId: SERVICE,
      groupIds: [GROUP_A],
      clientRequestId: "request-service-thumb3",
    });
    expect(sent.status).toBe("sent");
    expect(sendMedia).toHaveBeenCalled();
    expect(sendText).toHaveBeenCalled();
    expect(readFileSync("src/middleware.ts", "utf8")).toContain('"/api/services(.*)"');
  });

  it("offers WhatsApp publishing after creation and from the service dashboard", () => {
    const created = readFileSync("src/app/(dashboard)/dashboard/services/new/page.tsx", "utf8");
    const dashboard = readFileSync("src/app/(dashboard)/dashboard/services/page.tsx", "utf8");
    const editor = readFileSync("src/components/marketplace/ServiceEditor.tsx", "utf8");
    for (const source of [created, dashboard, editor]) {
      expect(source).toContain("ServiceWhatsAppPublishModal");
      expect(source).toContain("publishToGroups");
    }
    const preview = readFileSync("src/app/api/whatsapp/services/[serviceId]/preview/route.ts", "utf8");
    const publish = readFileSync("src/app/api/whatsapp/services/[serviceId]/publish/route.ts", "utf8");
    const retry = readFileSync("src/app/api/whatsapp/services/publications/[publicationId]/retry/route.ts", "utf8");
    for (const source of [preview, publish, retry]) {
      expect(source).toContain("requireServiceWhatsappPublisher");
    }
  });

  it("shows the preview, sends only the selected group, and retries after a failure", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/preview")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: "🛠️ Análise de solo",
            service: {
              title: "Análise de solo",
              providerName: "Fazenda Huambo",
              price: 25000,
              currency: "AOA",
              pricingType: "hourly",
              bookingUrl: "https://www.agroconnect.ao/services/analise-de-solo?book=1",
            },
            connection: { status: "connected", phone: "244900000000" },
            groups: [
              { id: GROUP_A, name: "Grupo 1" },
              { id: GROUP_B, name: "Grupo 2" },
            ],
          }),
        };
      }
      if (init?.method === "POST" && String(url).endsWith("/publish")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            publication: {
              id: "pub-1",
              status: "failed",
              targets: [{ id: "t1", groupId: GROUP_A, groupName: "Grupo 1", status: "failed", errorCode: "TEXT_FAILED" }],
            },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          publication: {
            id: "pub-1",
            status: "sent",
            targets: [{ id: "t1", groupId: GROUP_A, groupName: "Grupo 1", status: "sent", errorCode: null }],
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      createElement(I18nProvider, {
        initialLocale: "pt",
        children: createElement(ServiceWhatsAppPublishModal, {
          open: true,
          serviceId: SERVICE,
          onClose: () => undefined,
        }),
      })
    );
    expect(await screen.findByText("Análise de solo")).toBeTruthy();
    expect(screen.getByText(/Kz \/ hora/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Grupo 2"));
    fireEvent.click(screen.getByRole("button", { name: "PUBLICAR NOS GRUPOS" }));
    expect(await screen.findByText("Falha na publicação")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente nos grupos com falha" }));
    expect(await screen.findByText("Publicado")).toBeTruthy();
    const publishCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith("/publish"));
    const body = JSON.parse(String((publishCall?.[1] as RequestInit).body));
    expect(body.groupIds).toEqual([GROUP_A]);
    vi.unstubAllGlobals();
  });
});
