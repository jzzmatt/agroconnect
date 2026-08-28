import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("AgriService expert incoming service requests", () => {
  it("loads Pedidos Recebidos from the database instead of demo cards", () => {
    const src = read("src/app/(dashboard)/dashboard/requests/page.tsx");
    expect(src).toMatch("getProviderRequestsAction");
    expect(src).toMatch("getCustomerRequestsAction");
    expect(src).toMatch("updateServiceRequestStatusAction");
    expect(src).not.toMatch("req-demo-1");
    expect(src).not.toMatch("Fazenda Agro-Kwanza");
    expect(src).toMatch("useEffect");
  });

  it("requires auth before listing provider incoming requests", () => {
    const src = read("src/lib/services/marketplace-actions.ts");
    const listFn = src.slice(
      src.indexOf("export async function getProviderRequestsAction"),
      src.indexOf("export async function updateServiceRequestStatusAction")
    );
    expect(listFn).toMatch("await requireAuth()");
    expect(listFn).toMatch("getExistingProviderProfile");
    expect(listFn).not.toMatch("ensureCurrentProviderProfile");
    expect(listFn).toMatch('listServiceRequests("provider_id"');
  });

  it("does not treat a failed service request insert as success", () => {
    const src = read("src/lib/services/marketplace-actions.ts");
    const createFn = src.slice(
      src.indexOf("export async function createServiceRequestAction"),
      src.indexOf("export async function toggleFavoriteAction")
    );
    expect(createFn).toMatch("await requireAuth()");
    expect(createFn).toMatch("getMarketplaceWritableClient");
    expect(createFn).toMatch("success: false");
    expect(createFn).toMatch("service.provider_id");
    expect(createFn).toMatch("isSupabaseConfigured");
    expect(createFn).not.toMatch("requestId: data?.id || `req-");
  });

  it("rejects status changes without auth, entitlement, or ownership", () => {
    const src = read("src/lib/services/marketplace-actions.ts");
    const updateFn = src.slice(src.indexOf("export async function updateServiceRequestStatusAction"));
    expect(updateFn).toMatch("await requireAuth()");
    expect(updateFn).toMatch("can_manage_services");
    expect(updateFn).toMatch('.eq("provider_id", provider.id)');
    expect(updateFn).toMatch("Pedido não encontrado ou sem permissão");
  });

  it("surfaces create errors in the request modal", () => {
    const src = read("src/components/marketplace/ServiceRequestModal.tsx");
    expect(src).toMatch("res.error || res.message");
  });
});
