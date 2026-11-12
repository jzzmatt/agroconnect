"use server";

import { revalidatePath } from "next/cache";
import { resolveAdminActor } from "@/lib/admin/access";
import { writeAdminAudit } from "@/lib/admin/audit";
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

export async function refreshHealthAction(): Promise<void> {
  const actor = await actorOrForbidden();
  if (!actor) return;
  revalidatePath("/admin/health");
  revalidatePath("/admin");
}
