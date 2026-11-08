import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PRODUCT_VIDEO_MAX_SECONDS } from "@/config/product-catalog";
import { sendWaapiMedia, sendWaapiText } from "@/lib/integrations/waapi/messages";
import { validateProductVideo } from "@/lib/products/video-validation";
import { CommerceService } from "@/lib/services/commerce-service";
import { buildProductWhatsappMessage } from "@/lib/whatsapp/product-message";
import {
  createProductPublishService,
  type GroupSender,
  type PublicationRecord,
  type PublicationTarget,
  type PublishableProduct,
  type PublishConnection,
  type PublishStore,
} from "@/lib/whatsapp/publish-service";
import { WhatsappServiceError } from "@/lib/whatsapp/types";

const GROUP_A = "120363000000000001@g.us";
const GROUP_B = "120363000000000002@g.us";
const FOREIGN = "120363000000000099@g.us";
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

function product(patch: Partial<PublishableProduct> = {}): PublishableProduct {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    ownerUserId: USER,
    title: "Milho",
    description: "Semente certificada",
    price: 15000,
    province: "Huambo",
    municipality: "Caála",
    locality: null,
    transportIncluded: true,
    status: "published",
    availability: "in_stock",
    imageUrls: ["https://cdn.example/milho.jpg"],
    productImageUrl: "https://cdn.example/milho.jpg",
    thumbnailUrl: "https://cdn.example/milho-thumb.jpg",
    videoUrl: "https://cdn.example/milho.mp4",
    slug: "milho",
    ...patch,
  };
}

function connection(): PublishConnection {
  return { id: "conn-1", userId: USER, instanceId: "42", status: "connected", phone: "244900000000" };
}

function memoryStore(options?: { latestAt?: string | null; ownerId?: string }) {
  const publications = new Map<string, PublicationRecord>();
  let sequence = 0;
  const store: PublishStore = {
    async findConnection(userId) {
      return userId === USER ? connection() : null;
    },
    async listSavedGroups() {
      return [
        { id: GROUP_A, name: "Grupo 1", imageUrl: null, saved: true, available: true },
        { id: GROUP_B, name: "Grupo 2", imageUrl: null, saved: true, available: true },
      ];
    },
    async findProduct(productId) {
      const item = product({ id: productId, ownerUserId: options?.ownerId ?? USER });
      return item.id === productId ? item : null;
    },
    async findPublicationByRequest(userId, clientRequestId) {
      return [...publications.values()].find(
        (row) => row.userId === userId && row.clientRequestId === clientRequestId
      ) ?? null;
    },
    async latestPublicationAt() {
      return options?.latestAt === undefined ? null : options.latestAt;
    },
    async insertPublication(input) {
      if ([...publications.values()].some((row) => row.clientRequestId === input.clientRequestId)) {
        return "duplicate";
      }
      const record: PublicationRecord = {
        id: `pub-${++sequence}`,
        userId: input.userId,
        productId: input.productId,
        connectionId: input.connectionId,
        clientRequestId: input.clientRequestId,
        status: "processing",
        createdAt: new Date().toISOString(),
        targets: input.groups.map((group, index): PublicationTarget => ({
          id: `target-${sequence}-${index}`,
          groupId: group.id,
          groupName: group.name,
          status: "pending",
          mediaStatus: "pending",
          productImageStatus: "pending",
          thumbnailStatus: "pending",
          productImageMessageId: null,
          thumbnailMessageId: null,
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
      record.targets = record.targets.map((current) => (current.id === target.id ? target : current));
    },
    async savePublicationStatus(publicationId, status) {
      const record = publications.get(publicationId);
      if (record) record.status = status;
    },
    async claimForRetry(userId, publicationId) {
      const record = publications.get(publicationId);
      if (!record || record.userId !== userId) return false;
      if (record.status !== "failed" && record.status !== "partially_sent") return false;
      record.status = "processing";
      return true;
    },
    async findPublication(userId, publicationId) {
      const record = publications.get(publicationId);
      return record && record.userId === userId ? record : null;
    },
    async audit() {
      return undefined;
    },
  };
  return { store, publications };
}

describe("AgriProduct WhatsApp publishing", () => {
  afterEach(() => {
    CommerceService.resetMemoryStore();
    delete process.env.WAAPI_API_TOKEN;
  });

  it("builds the Angolan Portuguese message and omits empty fields", () => {
    const message = buildProductWhatsappMessage({
      name: "Milho",
      description: "   ",
      priceKz: 15000,
      province: "Huambo",
      municipality: "",
      locality: null,
      transportIncluded: false,
      videoUrl: "  ",
      orderUrl: "https://agroconnect.ao/order/abc?source=whatsapp",
    });
    expect(message).toContain("🌱 *NOVO PRODUTO DISPONÍVEL NO AGROCONNECT!*");
    expect(message).toContain("🥬 *Milho*");
    expect(message).toContain("💰 *Preço:*");
    expect(message).toContain("Kz");
    expect(message).toContain("📍 *Localização:* Huambo");
    expect(message).toContain("🚚 *Transporte:* Não incluído");
    expect(message).toContain("https://agroconnect.ao/order/abc?source=whatsapp");
    expect(message).toContain("#Agroconnect #AgriculturaAngolana #AgroProduct");
    expect(message).not.toContain("undefined");
    expect(message).not.toContain("📝");
    expect(message).not.toContain("🎥");
  });

  it("rejects a video longer than 60 seconds and accepts a shorter one", () => {
    const file = { mimeType: "video/mp4", fileSize: 1024, fileName: "campo.mp4" };
    expect(validateProductVideo({ ...file, durationSeconds: PRODUCT_VIDEO_MAX_SECONDS + 1 }).ok).toBe(false);
    expect(validateProductVideo({ ...file, durationSeconds: 45 }).ok).toBe(true);
  });

  it("adds a public product once and refuses a draft", async () => {
    const first = await CommerceService.addToCart({ productId: "prd-seed-1", quantity: 1, once: true });
    const second = await CommerceService.addToCart({ productId: "prd-seed-1", quantity: 1, once: true });
    expect(second.items[0]?.quantity).toBe(1);
    expect(second.items[0]?.unit_price).toBe(first.items[0]?.unit_price);
    const increased = await CommerceService.addToCart({ productId: "prd-seed-1", quantity: 1 });
    expect(increased.items[0]?.quantity).toBe(2);
    await expect(CommerceService.addToCart({ productId: "prd-seed-draft", quantity: 1 })).rejects.toThrow(
      /não encontrado/i
    );
  });

  it("sends media and text separately and does not resend a successful group", async () => {
    const calls: string[] = [];
    const failText = new Set<string>([GROUP_A]);
    const sender: GroupSender = {
      async sendMedia(_instanceId, chatId, mediaUrl) {
        calls.push(`media:${chatId}:${mediaUrl}`);
        return { messageId: `media-${chatId}` };
      },
      async sendText(_instanceId, chatId, message) {
        calls.push(`text:${chatId}`);
        expect(message).toContain("FAÇA JÁ A SUA ENCOMENDA");
        expect(message).toContain(`/order/`);
        expect(message).toContain("/agrishopping/products/milho");
        expect(message).not.toContain("undefined");
        if (failText.has(chatId)) throw new Error("rejected");
        return { messageId: `text-${chatId}` };
      },
    };
    const { store } = memoryStore();
    const service = createProductPublishService({ store, sender, origin: "https://agroconnect.ao" });
    const request = "request-id-00000001";
    const first = await service.publish(USER, {
      productId: product().id,
      groupIds: [GROUP_A, GROUP_B],
      clientRequestId: request,
    });
    expect(first.status).toBe("partially_sent");
    expect(first.targets.find((target) => target.groupId === GROUP_A)?.status).toBe("failed");
    expect(first.targets.find((target) => target.groupId === GROUP_B)?.status).toBe("sent");
    const callsAfterFirst = calls.length;

    const duplicate = await service.publish(USER, {
      productId: product().id,
      groupIds: [GROUP_A, GROUP_B],
      clientRequestId: request,
    });
    expect(duplicate.id).toBe(first.id);
    expect(calls).toHaveLength(callsAfterFirst);

    failText.delete(GROUP_A);
    const retried = await service.retry(USER, first.id);
    expect(retried.targets.every((target) => target.status === "sent")).toBe(true);
    expect(calls.filter((call) => call.startsWith(`media:${GROUP_A}`))).toHaveLength(2);
    expect(calls.filter((call) => call.startsWith(`text:${GROUP_A}`))).toHaveLength(2);
    expect(calls.filter((call) => call.startsWith(`text:${GROUP_B}`))).toHaveLength(1);
    expect(calls.filter((call) => call.startsWith(`media:${GROUP_B}`))).toHaveLength(2);
    expect(calls.indexOf(`media:${GROUP_A}:https://cdn.example/milho.jpg`)).toBeLessThan(
      calls.indexOf(`media:${GROUP_A}:https://cdn.example/milho-thumb.jpg`)
    );
  });

  it("publishes the product image, message, and video link without a thumbnail", async () => {
    const calls: string[] = [];
    const sender: GroupSender = {
      async sendMedia(_instanceId, _chatId, mediaUrl, caption) {
        calls.push(`media:${mediaUrl}`);
        expect(caption).toContain("FAÇA JÁ A SUA ENCOMENDA");
        return { messageId: mediaUrl };
      },
      async sendText(_instanceId, _chatId, message) {
        calls.push("text");
        expect(message).toContain("https://cdn.example/milho.mp4");
        expect(message).toContain("FAÇA JÁ A SUA ENCOMENDA");
        return { messageId: "text-1" };
      },
    };
    const { store } = memoryStore();
    store.findProduct = async () => product({ thumbnailUrl: null });
    const service = createProductPublishService({ store, sender, origin: "https://agroconnect.ao" });
    const published = await service.publish(USER, {
      productId: product().id,
      groupIds: [GROUP_A],
      clientRequestId: "request-id-00000008",
    });
    expect(published.status).toBe("sent");
    expect(published.targets[0]?.thumbnailStatus).toBe("skipped");
    expect(calls).toEqual(["media:https://cdn.example/milho.jpg", "text"]);
    const retried = await service.retry(USER, published.id);
    expect(retried.status).toBe("sent");
    expect(calls).toEqual(["media:https://cdn.example/milho.jpg", "text"]);
  });

  it("retries only the thumbnail after the product image was already sent", async () => {
    const calls: string[] = [];
    let failThumbnail = true;
    const sender: GroupSender = {
      async sendMedia(_instanceId, _chatId, mediaUrl, caption) {
        calls.push(mediaUrl);
        if (mediaUrl.includes("milho.jpg")) expect(caption).toContain("FAÇA JÁ A SUA ENCOMENDA");
        if (mediaUrl.includes("thumb")) expect(caption).toContain("https://cdn.example/milho.mp4");
        if (failThumbnail && mediaUrl.includes("thumb")) throw new Error("thumbnail");
        return { messageId: mediaUrl };
      },
      async sendText() {
        return { messageId: "text" };
      },
    };
    const { store } = memoryStore();
    const service = createProductPublishService({ store, sender, origin: "https://agroconnect.ao" });
    const first = await service.publish(USER, {
      productId: product().id,
      groupIds: [GROUP_A],
      clientRequestId: "request-id-00000009",
    });
    expect(first.status).toBe("failed");
    expect(first.targets[0]?.productImageStatus).toBe("sent");
    expect(first.targets[0]?.thumbnailStatus).toBe("failed");
    expect(calls.filter((call) => call.includes("milho.jpg"))).toHaveLength(1);
    failThumbnail = false;
    const retried = await service.retry(USER, first.id);
    expect(retried.status).toBe("sent");
    expect(calls.filter((call) => call.includes("milho.jpg"))).toHaveLength(1);
    expect(calls.filter((call) => call.includes("thumb"))).toHaveLength(2);
    expect(retried.targets[0]?.productImageMessageId).toContain("milho.jpg");
  });

  it("refuses another account's group and an unpublished product", async () => {
    const calls: string[] = [];
    const sender: GroupSender = {
      async sendMedia() {
        calls.push("media");
        return { messageId: "m" };
      },
      async sendText() {
        calls.push("text");
        return { messageId: "t" };
      },
    };
    const foreign = memoryStore();
    const service = createProductPublishService({
      store: foreign.store,
      sender,
      origin: "https://agroconnect.ao",
    });
    await expect(
      service.publish(USER, {
        productId: product().id,
        groupIds: [FOREIGN],
        clientRequestId: "request-id-00000002",
      })
    ).rejects.toMatchObject({ code: "GROUP_NOT_FOUND" });
    expect(calls).toEqual([]);

    const unpublished = memoryStore();
    unpublished.store.findProduct = async () => product({ status: "draft" });
    const blocked = createProductPublishService({
      store: unpublished.store,
      sender,
      origin: "https://agroconnect.ao",
    });
    await expect(
      blocked.publish(USER, {
        productId: product().id,
        groupIds: [GROUP_A],
        clientRequestId: "request-id-00000003",
      })
    ).rejects.toBeInstanceOf(WhatsappServiceError);

    const otherOwner = memoryStore({ ownerId: OTHER });
    const isolated = createProductPublishService({
      store: otherOwner.store,
      sender,
      origin: "https://agroconnect.ao",
    });
    await expect(
      isolated.publish(USER, {
        productId: product().id,
        groupIds: [GROUP_A],
        clientRequestId: "request-id-00000004",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(calls).toEqual([]);
  });

  it("uses the documented WaAPI send endpoints without putting the token in the body", async () => {
    process.env.WAAPI_API_TOKEN = "server-token";
    const bodies: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(`${String(input)} ${String(init?.body)}`);
      const header = new Headers(init?.headers).get("Authorization") || "";
      expect(String(init?.body)).not.toContain("server-token");
      expect(header).toBe("Bearer server-token");
      return new Response(
        JSON.stringify({ data: { status: "success", data: { _data: { id: { _serialized: "true_1@g.us_ABC" } } } } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    await sendWaapiMedia("42", GROUP_A, "https://cdn.example/milho.jpg", fetchImpl, "Milho 15000 Kz");
    await sendWaapiText("42", GROUP_A, "Encomende aqui", fetchImpl);
    expect(bodies[0]).toContain("/instances/42/client/action/send-media");
    expect(bodies[0]).toContain("\"mediaCaption\":\"Milho 15000 Kz\"");
    expect(bodies[1]).toContain("/instances/42/client/action/send-message");
    expect(bodies[1]).toContain("\"previewLink\":true");
  });

  it("keeps capture, transport, confirmation and the order link in the product flow", () => {
    const root = resolve(process.cwd(), "src");
    const image = readFileSync(resolve(root, "components/shopping/ProductImageUploader.tsx"), "utf8");
    const video = readFileSync(resolve(root, "components/shopping/ProductVideoUploader.tsx"), "utf8");
    const form = readFileSync(resolve(root, "components/shopping/ProductCreateWorkspacePage.tsx"), "utf8");
    const order = readFileSync(resolve(root, "app/order/[productId]/page.tsx"), "utf8");
    const modal = readFileSync(resolve(root, "components/whatsapp/WhatsAppPublishModal.tsx"), "utf8");
    expect(image).toContain('capture="environment"');
    expect(video).toContain('capture="environment"');
    expect(form).toContain("transportIncluded");
    expect(form).toContain("WhatsAppPublishModal");
    expect(form).toContain("requestPublish(event)");
    expect(form).toContain('"publish"');
    expect(modal).toContain("clientRequestId");
    expect(order).toContain("once: true");
    expect(order).toContain('redirect("/cart")');
    expect(order).toContain("redirect_url");
  });
});
