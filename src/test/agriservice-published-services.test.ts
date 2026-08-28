import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MarketplaceService } from "@/lib/services/marketplace-service";

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("AgriService published service cards", () => {
  it("allows public SELECT of published services, not only legacy active rows", () => {
    const src = read("supabase/migrations/20260828000001_042_public_read_published_services.sql");
    expect(src).toMatch("Public read published services");
    expect(src).toMatch("status IN ('active', 'published')");
    expect(src).toMatch("DROP POLICY IF EXISTS \"Public read active services\"");
  });

  it("loads AgriService service cards through the server search action", () => {
    const src = read("src/components/marketplace/MarketplaceDiscovery.tsx");
    expect(src).toMatch("searchServicesAction");
    expect(src).not.toMatch("INITIAL_SERVICES");
    expect(src).not.toMatch("MarketplaceService.searchServices");
    expect(src).toMatch("useState<ServiceListItem[]>([])");
    expect(src).toMatch("hasUserCoords ? selectedRadius : undefined");
  });

  it("does not treat a failed service insert as a successful publish", () => {
    const src = read("src/lib/services/marketplace-actions.ts");
    expect(src).toMatch("await requireAuth()");
    expect(src).toMatch("can_manage_services");
    expect(src).toMatch("SERVICE_CREATION_LOCKED");
    expect(src).toMatch("Não foi possível publicar o serviço");
    expect(src).toMatch("revalidatePath(\"/agriservice\")");
    expect(src).toMatch("listMyServicesAction");

    const createFn = src.slice(src.indexOf("export async function createServiceAction"), src.indexOf("export async function updateServiceAction"));
    expect(createFn).toMatch("isSupabaseConfigured()");
    expect(createFn).toMatch("throw new Error");
  });

  it("requires auth before listing the provider's own services", () => {
    const src = read("src/lib/services/marketplace-actions.ts");
    const listFn = src.slice(
      src.indexOf("export async function listMyServicesAction"),
      src.indexOf("export async function getOrCreateCurrentProviderProfileAction")
    );
    expect(listFn).toMatch("await requireAuth()");
    expect(listFn).toMatch("getProviderServices(provider.id, false)");
  });

  it("loads the services dashboard from the database instead of seed cards", () => {
    const src = read("src/app/(dashboard)/dashboard/services/page.tsx");
    expect(src).toMatch("listMyServicesAction");
    expect(src).not.toMatch("INITIAL_SERVICES");
  });

  it("still returns seed marketplace cards when Supabase is not configured", async () => {
    const result = await MarketplaceService.searchServices({ query: "veterinária" });
    expect(result.services.length).toBeGreaterThan(0);
  });
});
