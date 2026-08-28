import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MarketplaceService, INITIAL_SERVICES } from "@/lib/services/marketplace-service";
import {
  canPermanentlyDeleteService,
  deleteDialogForServiceStatus,
} from "@/lib/services/service-delete-flow";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { getDictionary } from "@/i18n";

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("AgriService edit and delete", () => {
  it("only allows deleting draft, paused or archived services", () => {
    expect(canPermanentlyDeleteService("draft")).toBe(true);
    expect(canPermanentlyDeleteService("paused")).toBe(true);
    expect(canPermanentlyDeleteService("archived")).toBe(true);
    expect(canPermanentlyDeleteService("published")).toBe(false);
    expect(canPermanentlyDeleteService("active")).toBe(false);
    expect(deleteDialogForServiceStatus("published")).toBe("published_block");
    expect(deleteDialogForServiceStatus("active")).toBe("published_block");
    expect(deleteDialogForServiceStatus("paused")).toBe("confirm_delete");
    expect(deleteDialogForServiceStatus("draft")).toBe("confirm_delete");
  });

  it("refuses to delete a published marketplace service", async () => {
    const published = INITIAL_SERVICES.find(
      (item) => item.status === "published" || item.status === "active"
    );
    expect(published).toBeDefined();
    const result = await MarketplaceService.deleteService(published!.id, published!.provider_id);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Pausa a publicação/i);
    expect(INITIAL_SERVICES.some((item) => item.id === published!.id)).toBe(true);
  });

  it("deletes a paused service from the in-memory catalogue without touching seed rows", async () => {
    if (isSupabaseConfigured()) return;
    const source = INITIAL_SERVICES.find(
      (item) => item.status === "published" || item.status === "active"
    );
    expect(source).toBeDefined();
    const tempId = "srv-temp-delete-ux";
    INITIAL_SERVICES.push({
      ...source!,
      id: tempId,
      slug: `${source!.slug}-temp-delete`,
      status: "paused",
    });
    const result = await MarketplaceService.deleteService(tempId, source!.provider_id);
    expect(result.success).toBe(true);
    expect(INITIAL_SERVICES.some((item) => item.id === tempId)).toBe(false);
    expect(INITIAL_SERVICES.some((item) => item.id === source!.id)).toBe(true);
  });

  it("exposes pause-before-delete copy in pt/en/fr", () => {
    const pt = getDictionary("pt");
    const en = getDictionary("en");
    const fr = getDictionary("fr");
    expect(pt.agriexpert.deletePublishedTitle).toMatch(/Pausa/i);
    expect(pt.agriexpert.deletePublishedBlock).toMatch(/publicado/i);
    expect(en.agriexpert.deletePublishedBlock).toMatch(/Pause/i);
    expect(fr.agriexpert.deletePublishedBlock).toMatch(/pause/i);
    expect(pt.agriexpert.editService).toMatch(/Editar/i);
    expect(pt.agriexpert.deleteService).toMatch(/Eliminar/i);
  });

  it("wires edit, delete and pause-before-delete on the services dashboard", () => {
    const page = read("src/app/(dashboard)/dashboard/services/page.tsx");
    const editor = read("src/components/marketplace/ServiceEditor.tsx");
    const editPage = read("src/app/(dashboard)/dashboard/services/[serviceId]/edit/page.tsx");
    const actions = read("src/lib/services/marketplace-actions.ts");
    const dialog = read("src/components/marketplace/ServiceDeleteDialog.tsx");

    expect(page).toContain("deleteServiceAction");
    expect(page).toContain("ServiceDeleteDialog");
    expect(page).toContain("/dashboard/services/${service.id}/edit");
    expect(page).toContain("dict.agriexpert.editService");
    expect(page).toContain("dict.agriexpert.deleteService");
    expect(page).toContain("deleteDialogForServiceStatus");

    expect(editor).toContain("updateServiceAction");
    expect(editor).toContain("deleteServiceAction");
    expect(editor).toContain("ServiceDeleteDialog");

    expect(editPage).toContain("getMyServiceAction");
    expect(editPage).toContain("ServiceEditor");

    expect(actions).toContain("export async function getMyServiceAction");
    expect(actions).toContain("export async function deleteServiceAction");
    expect(actions).toContain("await requireAuth()");
    expect(actions).toContain("can_manage_services");
    expect(actions).toContain("provider_id");
    expect(actions).toContain("canPermanentlyDeleteService");
    expect(actions).not.toContain('await import("@/lib/services/service-delete-flow")');

    expect(dialog).toContain("published_block");
    expect(dialog).toContain("dict.agriexpert.deletePublishedBlock");
  });
});
