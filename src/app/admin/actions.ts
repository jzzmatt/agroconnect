"use server";

import { revalidatePath } from "next/cache";
import { resolveAdminActor } from "@/lib/admin/access";
import { writeAdminAudit } from "@/lib/admin/audit";
import { removeAccount, setAccountOpen } from "@/lib/admin/accounts";
import { removeCatalogRecord, setTransportPublished } from "@/lib/admin/catalog";
import { parseCatalogKind, type CatalogKind } from "@/lib/admin/catalog-target";
import {
  createShowcaseBatch,
  removeAllDemoBatches,
  removeDemoBatch,
  setDemoCatalogEnabled,
} from "@/lib/admin/data";

export type AdminActionResult =
  | { ok: true }
  | { ok: false; error: "forbidden" | "unavailable" | "failed" | "conflict" };

async function actorOrForbidden() {
  const actor = await resolveAdminActor();
  if (!actor) return null;
  return actor;
}

export async function setDemoVisibilityAction(enabled: boolean): Promise<AdminActionResult> {
  const actor = await actorOrForbidden();
  if (!actor) return { ok: false, error: "forbidden" };
  const result = await setDemoCatalogEnabled(enabled, actor.profileId);
  if (!result.ok) return { ok: false, error: result.error };
  await writeAdminAudit({
    actorProfileId: actor.profileId,
    action: "demo.visibility.update",
    entityType: "site_settings",
    entityId: "demo_catalog_enabled",
    metadata: { enabled },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/demo-catalog");
  return { ok: true };
}

export async function createShowcaseBatchAction(): Promise<AdminActionResult> {
  const actor = await actorOrForbidden();
  if (!actor) return { ok: false, error: "forbidden" };
  const result = await createShowcaseBatch(actor.profileId);
  if (!result.ok) return { ok: false, error: result.error };
  await writeAdminAudit({
    actorProfileId: actor.profileId,
    action: "demo.batch.create",
    entityType: "demo_batch",
    entityId: result.batchId,
    metadata: { slug: "agroconnect-showcase" },
  });
  revalidatePath("/admin/demo-catalog");
  return { ok: true };
}

export async function removeDemoBatchAction(batchId: string): Promise<AdminActionResult> {
  const actor = await actorOrForbidden();
  if (!actor) return { ok: false, error: "forbidden" };
  const result = await removeDemoBatch(batchId);
  if (!result.ok) return { ok: false, error: result.error };
  await writeAdminAudit({
    actorProfileId: actor.profileId,
    action: "demo.batch.delete",
    entityType: "demo_batch",
    entityId: batchId,
    metadata: { count: result.count },
  });
  revalidatePath("/admin/demo-catalog");
  return { ok: true };
}

export async function removeAllDemoBatchesAction(expectedCount: number): Promise<AdminActionResult> {
  const actor = await actorOrForbidden();
  if (!actor) return { ok: false, error: "forbidden" };
  const result = await removeAllDemoBatches(expectedCount);
  if (!result.ok) return { ok: false, error: result.error };
  await writeAdminAudit({
    actorProfileId: actor.profileId,
    action: "demo.batch.delete_all",
    entityType: "demo_batch",
    metadata: { count: result.count },
  });
  revalidatePath("/admin/demo-catalog");
  return { ok: true };
}

export type CatalogRemoveResult =
  | { ok: true }
  | { ok: false; error: "forbidden" | "unavailable" | "not_found" | "dependency" | "failed" };

export async function removeCatalogItemAction(kind: CatalogKind, id: string): Promise<CatalogRemoveResult> {
  const actor = await actorOrForbidden();
  if (!actor) return { ok: false, error: "forbidden" };
  const catalogKind = parseCatalogKind(kind);
  if (catalogKind !== kind) return { ok: false, error: "failed" };
  const result = await removeCatalogRecord(catalogKind, id);
  if (!result.ok) return result;
  await writeAdminAudit({
    actorProfileId: actor.profileId,
    action: `admin.${catalogKind}.delete`,
    entityType: catalogKind,
    entityId: result.id,
    metadata: { title: result.title, slug: result.slug },
  });
  revalidatePath("/admin", "layout");
  revalidatePath("/agrishopping", "layout");
  revalidatePath("/agriacademy", "layout");
  revalidatePath("/agriservice", "layout");
  revalidatePath("/services", "layout");
  revalidatePath("/transport", "layout");
  return { ok: true };
}

function revalidateAccountSurfaces() {
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/agrishopping", "layout");
  revalidatePath("/agriacademy", "layout");
  revalidatePath("/agriservice", "layout");
  revalidatePath("/services", "layout");
  revalidatePath("/transport", "layout");
}

export async function setTransportActiveAction(
  id: string,
  active: boolean
): Promise<CatalogRemoveResult> {
  const actor = await actorOrForbidden();
  if (!actor) return { ok: false, error: "forbidden" };
  const result = await setTransportPublished(id, active);
  if (!result.ok) return result;
  await writeAdminAudit({
    actorProfileId: actor.profileId,
    action: active ? "admin.transport.activate" : "admin.transport.deactivate",
    entityType: "transport",
    entityId: result.id,
    metadata: { title: result.title, slug: result.slug, status: result.status },
  });
  revalidateAccountSurfaces();
  return { ok: true };
}

export type AccountManageResult =
  | { ok: true }
  | { ok: false; error: "forbidden" | "unavailable" | "not_found" | "protected" | "dependency" | "failed" };

export async function setAccountActiveAction(profileId: string, active: boolean): Promise<AccountManageResult> {
  const actor = await actorOrForbidden();
  if (!actor) return { ok: false, error: "forbidden" };
  const result = await setAccountOpen(actor, profileId, active);
  if (!result.ok) return result;
  await writeAdminAudit({
    actorProfileId: actor.profileId,
    action: active ? "admin.account.activate" : "admin.account.deactivate",
    entityType: "profile",
    entityId: result.id,
    metadata: { name: result.name },
  });
  revalidateAccountSurfaces();
  return { ok: true };
}

export async function removeAccountAction(profileId: string): Promise<AccountManageResult> {
  const actor = await actorOrForbidden();
  if (!actor) return { ok: false, error: "forbidden" };
  const result = await removeAccount(actor, profileId);
  if (!result.ok) return result;
  await writeAdminAudit({
    actorProfileId: actor.profileId,
    action: "admin.account.delete",
    entityType: "profile",
    entityId: result.id,
    metadata: { name: result.name },
  });
  revalidateAccountSurfaces();
  return { ok: true };
}

export async function refreshHealthAction(): Promise<void> {
  const actor = await actorOrForbidden();
  if (!actor) return;
  revalidatePath("/admin/health");
  revalidatePath("/admin");
}
