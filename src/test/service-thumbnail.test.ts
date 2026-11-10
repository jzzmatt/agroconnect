import { readFileSync } from "node:fs";
import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ServiceThumbnailControls } from "@/components/marketplace/ServiceThumbnailControls";
import { I18nProvider } from "@/i18n/provider";
import {
  pendingServiceThumbnailPath,
  savedServiceThumbnailPath,
  serviceThumbnailPrompt,
  serviceThumbnailPublicPath,
} from "@/lib/services/service-thumbnail";
import {
  createServiceThumbnailService,
  type ServiceThumbnailStore,
} from "@/lib/services/service-thumbnail-service";

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const SERVICE = "33333333-3333-4333-8333-333333333333";
const PREVIEW = "44444444-4444-4444-8444-444444444444";

function memoryStore(owner = OWNER, status = "published") {
  const pending = new Map<string, Buffer>();
  const saved = new Map<string, Buffer>();
  let records = 0;
  const store: ServiceThumbnailStore = {
    async findOwnedService(profileId) {
      if (profileId !== owner) return null;
      return {
        id: SERVICE,
        title: "Análise de solo",
        description: "Amostras de solo",
        provinceName: "Huambo",
        municipalityName: "Caála",
        status,
        ownerProfileId: owner,
      };
    },
    async findServiceAccess() {
      return { ownerProfileId: owner, status };
    },
    async putPending(path, bytes) {
      pending.set(path, bytes);
    },
    async readPending(path) {
      return pending.get(path) || null;
    },
    async remove(path) {
      pending.delete(path);
      saved.delete(path);
    },
    async putSaved(path, bytes) {
      saved.set(path, bytes);
    },
    async saveRecord() {
      records += 1;
    },
    async readSaved() {
      const path = savedServiceThumbnailPath(owner, SERVICE);
      const bytes = saved.get(path);
      if (!bytes) return null;
      return { storageKey: path, ownerProfileId: owner, bytes };
    },
  };
  return { store, pending, saved, recordCount: () => records };
}

describe("service thumbnail", () => {
  it("describes the service without asking the model to paint text", () => {
    const prompt = serviceThumbnailPrompt({
      title: "Análise de solo",
      description: "Amostras de solo",
      provinceName: "Huambo",
      municipalityName: "Caála",
    });
    expect(prompt).toContain("Análise de solo");
    expect(prompt).toContain("Caála");
    expect(prompt).toContain("No text");
  });

  it("keeps a preview until the owner saves it and ignores another provider", async () => {
    const { store, pending, recordCount } = memoryStore();
    const image = Buffer.from("jpeg-bytes");
    const workflow = createServiceThumbnailService({
      store,
      generate: async () => image,
      newId: () => PREVIEW,
    });
    const preview = await workflow.generate(OWNER, SERVICE);
    expect(preview.previewId).toBe(PREVIEW);
    expect(recordCount()).toBe(0);
    expect(pending.has(pendingServiceThumbnailPath(OWNER, SERVICE, PREVIEW))).toBe(true);
    await expect(workflow.save(OTHER, SERVICE, PREVIEW)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(recordCount()).toBe(0);
    const saved = await workflow.save(OWNER, SERVICE, PREVIEW);
    expect(saved.url).toBe(serviceThumbnailPublicPath(SERVICE));
    expect(recordCount()).toBe(1);
    expect(pending.size).toBe(0);
    const visible = await workflow.read(SERVICE, null);
    expect(visible?.bytes.equals(image)).toBe(true);
  });

  it("drops a cancelled preview and hides a draft thumbnail from other people", async () => {
    const { store, pending, recordCount } = memoryStore(OWNER, "draft");
    const workflow = createServiceThumbnailService({
      store,
      generate: async () => Buffer.from("jpeg-bytes"),
      newId: () => PREVIEW,
    });
    await workflow.generate(OWNER, SERVICE);
    await workflow.cancel(OWNER, SERVICE, PREVIEW);
    expect(pending.size).toBe(0);
    expect(recordCount()).toBe(0);
    await workflow.generate(OWNER, SERVICE);
    await workflow.save(OWNER, SERVICE, PREVIEW);
    expect(await workflow.read(SERVICE, null)).toBeNull();
    expect(await workflow.read(SERVICE, OWNER)).not.toBeNull();
    expect(savedServiceThumbnailPath(OWNER, SERVICE)).not.toContain("pending");
  });

  it("offers generate, save, cancel, and regenerate on the editor and after creation", async () => {
    const editor = readFileSync("src/components/marketplace/ServiceEditor.tsx", "utf8");
    const created = readFileSync("src/app/(dashboard)/dashboard/services/new/page.tsx", "utf8");
    const saveRoute = readFileSync("src/app/api/services/[serviceId]/thumbnail/save/route.ts", "utf8");
    expect(editor).toContain("ServiceThumbnailControls");
    expect(created).toContain("ServiceThumbnailControls");
    expect(saveRoute).toContain("previewId");
    expect(saveRoute).not.toContain("formData");
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (String(url).endsWith("/generate")) {
        return { ok: true, json: async () => ({ previewId: PREVIEW, imageBase64: "aW1hZ2U=" }) };
      }
      return { ok: true, json: async () => ({ url: serviceThumbnailPublicPath(SERVICE) }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      createElement(I18nProvider, {
        initialLocale: "pt",
        children: createElement(ServiceThumbnailControls, { serviceId: SERVICE }),
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Gerar miniatura" }));
    expect(await screen.findByRole("button", { name: "Guardar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Gerar novamente" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Miniatura guardada.")).toBeTruthy();
    const saveCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith("/save"));
    expect(JSON.parse(String((saveCall?.[1] as RequestInit | undefined)?.body))).toEqual({ previewId: PREVIEW });
    vi.unstubAllGlobals();
  });
});
