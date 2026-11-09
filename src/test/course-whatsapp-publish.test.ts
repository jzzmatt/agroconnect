import { readFileSync } from "node:fs";
import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CourseWhatsAppShareModal } from "@/components/academy/CourseWhatsAppShareModal";
import { I18nProvider } from "@/i18n/provider";
import { buildCourseCompletionMessage, coursePageUrl } from "@/lib/whatsapp/course-message";
import {
  createCoursePublishService,
  type CourseShareConnection,
  type CourseShareRecord,
  type CourseShareStore,
  type CourseTextSender,
  type ShareableCourse,
} from "@/lib/whatsapp/course-publish-service";
import { WhatsappServiceError } from "@/lib/whatsapp/types";

const GROUP_A = "120363000000000001@g.us";
const GROUP_B = "120363000000000002@g.us";
const FOREIGN = "120363000000000099@g.us";
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const COURSE = "33333333-3333-4333-8333-333333333333";
const ORIGIN = "https://www.agroconnect.ao";

function course(patch: Partial<ShareableCourse> = {}): ShareableCourse {
  return {
    id: COURSE,
    ownerUserId: USER,
    title: "Gestão de milho",
    slug: "gestao-de-milho",
    instructorName: "Mateus Junior",
    price: 15000,
    currency: "AOA",
    status: "published",
    priceConfirmed: true,
    ...patch,
  };
}

function connection(): CourseShareConnection {
  return { id: "conn-1", userId: USER, instanceId: "42", status: "connected", phone: "244900000000" };
}

function memoryStore(item = course()) {
  const publications = new Map<string, CourseShareRecord>();
  let sequence = 0;
  const saved = item;
  const store: CourseShareStore = {
    async findConnection(userId) {
      return userId === USER ? connection() : null;
    },
    async listSavedGroups() {
      return [
        { id: GROUP_A, name: "Grupo 1", imageUrl: null, saved: true, available: true },
        { id: GROUP_B, name: "Grupo 2", imageUrl: null, saved: true, available: true },
      ];
    },
    async findCourse() {
      return saved;
    },
    async findPublicationByRequest(userId, clientRequestId) {
      return [...publications.values()].find(
        (row) => row.userId === userId && row.clientRequestId === clientRequestId
      ) || null;
    },
    async latestPublicationAt(userId) {
      const rows = [...publications.values()].filter((row) => row.userId === userId);
      return rows.at(-1)?.createdAt || null;
    },
    async insertPublication(input) {
      if ([...publications.values()].some((row) => row.userId === input.userId && row.clientRequestId === input.clientRequestId)) {
        return "duplicate";
      }
      sequence += 1;
      const record: CourseShareRecord = {
        id: `pub-${sequence}`,
        userId: input.userId,
        courseId: input.courseId,
        connectionId: input.connectionId,
        clientRequestId: input.clientRequestId,
        status: "processing",
        createdAt: "2026-11-09T09:00:00.000Z",
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
  return { store, course: saved };
}

function service(store: CourseShareStore, sender: CourseTextSender, now = () => new Date("2026-11-09T10:00:00.000Z")) {
  return createCoursePublishService({ store, sender, origin: ORIGIN, now });
}

describe("course completion WhatsApp share", () => {
  it("builds a preview with the saved price, instructor, status, and course link", async () => {
    const { store } = memoryStore(course({ price: 0 }));
    const sender: CourseTextSender = { sendText: vi.fn() };
    const preview = await service(store, sender).preview(USER, COURSE);
    expect(preview.course.courseUrl).toBe(coursePageUrl(ORIGIN, "gestao-de-milho"));
    expect(preview.message).toContain("Gestão de milho");
    expect(preview.message).toContain("Concluído");
    expect(preview.message).toContain("Mateus Junior");
    expect(preview.message).toContain("Gratuito");
    expect(preview.message).toContain("https://www.agroconnect.ao/agriacademy/courses/gestao-de-milho");
    expect(preview.message).not.toContain("/a/");
    expect(preview.groups.map((group) => group.id)).toEqual([GROUP_A, GROUP_B]);
    expect(buildCourseCompletionMessage({
      title: "Gestão de milho",
      instructorName: "Mateus Junior",
      price: 15000,
      currency: "AOA",
      courseUrl: preview.course.courseUrl,
    })).toContain("15.000 Kz");
  });

  it("adds the short demo video link and leaves signed storage urls out", async () => {
    const { store } = memoryStore(course({ demoShareCode: "k3m9qx2p" }));
    const sender: CourseTextSender = { sendText: vi.fn() };
    const preview = await service(store, sender).preview(USER, COURSE);
    expect(preview.message).toContain("https://www.agroconnect.ao/a/k3m9qx2p");
    expect(preview.message).toContain("Ver a aula de demonstração");
    expect(preview.message).not.toContain("token=");
    expect(preview.message).not.toContain("supabase");
  });

  it("sends only to saved groups and does not send again for the same request", async () => {
    const { store, course: saved } = memoryStore();
    const sendText = vi.fn(async () => ({ messageId: "msg-1" }));
    const api = service(store, { sendText });
    const first = await api.publish(USER, {
      courseId: COURSE,
      groupIds: [GROUP_A],
      clientRequestId: "request-course-0001",
    });
    expect(first.status).toBe("sent");
    expect(saved.price).toBe(15000);
    expect(saved.status).toBe("published");
    const second = await api.publish(USER, {
      courseId: COURSE,
      groupIds: [GROUP_A],
      clientRequestId: "request-course-0001",
    });
    expect(second.id).toBe(first.id);
    expect(sendText).toHaveBeenCalledTimes(1);
    await expect(
      api.publish(USER, { courseId: COURSE, groupIds: [FOREIGN], clientRequestId: "request-course-0002" })
    ).rejects.toMatchObject({ code: "GROUP_NOT_FOUND" } satisfies Partial<WhatsappServiceError>);
  });

  it("keeps the course published when WaAPI fails and retries only the failed group", async () => {
    const { store, course: saved } = memoryStore();
    const calls: string[] = [];
    const sendText = vi.fn(async (_instance: string, chatId: string) => {
      calls.push(chatId);
      if (chatId === GROUP_B && calls.filter((id) => id === GROUP_B).length === 1) {
        throw new Error("waapi down");
      }
      return { messageId: `msg-${chatId}` };
    });
    const api = service(store, { sendText });
    const failed = await api.publish(USER, {
      courseId: COURSE,
      groupIds: [GROUP_A, GROUP_B],
      clientRequestId: "request-course-0003",
    });
    expect(failed.status).toBe("partially_sent");
    expect(saved.status).toBe("published");
    expect(saved.priceConfirmed).toBe(true);
    const retried = await api.retry(USER, failed.id);
    expect(retried.status).toBe("sent");
    expect(calls.filter((id) => id === GROUP_A)).toHaveLength(1);
    expect(calls.filter((id) => id === GROUP_B)).toHaveLength(2);
  });

  it("rejects another instructor and a course that is not completed", async () => {
    const { store } = memoryStore(course({ ownerUserId: OTHER }));
    const api = service(store, { sendText: vi.fn() });
    await expect(api.preview(USER, COURSE)).rejects.toMatchObject({ status: 404 });
    const unpublished = memoryStore(course({ status: "draft", priceConfirmed: false }));
    await expect(service(unpublished.store, { sendText: vi.fn() }).preview(USER, COURSE)).rejects.toMatchObject({
      status: 409,
    });
  });

  it("authorizes the course routes and does not trust a client price", () => {
    const preview = readFileSync("src/app/api/whatsapp/courses/[courseId]/preview/route.ts", "utf8");
    const publish = readFileSync("src/app/api/whatsapp/courses/[courseId]/publish/route.ts", "utf8");
    const retry = readFileSync("src/app/api/whatsapp/courses/publications/[publicationId]/retry/route.ts", "utf8");
    for (const source of [preview, publish, retry]) {
      expect(source).toContain("requireCourseWhatsappPublisher");
    }
    expect(publish).not.toContain("price");
    expect(publish).toContain("groupIds");
  });

  it("shows the preview, sends the selected group, and retries after a failure", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/preview")) {
        return {
          ok: true,
          json: async () => ({
            message: "🎓 CURSO CONCLUÍDO",
            course: {
              id: COURSE,
              title: "Gestão de milho",
              instructorName: "Mateus Junior",
              price: 15000,
              currency: "AOA",
              courseUrl: "https://www.agroconnect.ao/agriacademy/courses/gestao-de-milho",
            },
            connection: { status: "connected", phone: "244900000000" },
            groups: [{ id: GROUP_A, name: "Grupo 1" }],
          }),
        };
      }
      if (init?.method === "POST" && String(url).endsWith("/publish")) {
        return {
          ok: true,
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
        children: createElement(CourseWhatsAppShareModal, {
          open: true,
          courseId: COURSE,
          onClose: () => undefined,
        }),
      })
    );
    expect(await screen.findByText("Gestão de milho")).toBeTruthy();
    expect(screen.getByText("15.000 Kz")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Grupo 1"));
    fireEvent.click(screen.getByRole("button", { name: "PUBLICAR NOS GRUPOS" }));
    expect(await screen.findByText("Falha na publicação")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente nos grupos com falha" }));
    expect(await screen.findByText("Publicado")).toBeTruthy();
    const publishCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith("/publish"));
    const body = JSON.parse(String((publishCall?.[1] as RequestInit).body));
    expect(body.groupIds).toEqual([GROUP_A]);
    expect(body.price).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
