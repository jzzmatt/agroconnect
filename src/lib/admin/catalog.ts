import "server-only";

import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  catalogTable,
  parseCatalogId,
  sanitizeCatalogSearch,
  type CatalogKind,
} from "./catalog-target";

export interface CatalogItem {
  id: string;
  title: string;
  slug: string;
  status: string;
}

export async function listCatalogItems(
  kind: CatalogKind,
  rawQuery: string
): Promise<CatalogItem[] | null> {
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) return null;
  const query = sanitizeCatalogSearch(rawQuery);
  try {
    let request = (admin.from(catalogTable(kind)) as any)
      .select("id, title, slug, status")
      .order("created_at", { ascending: false })
      .limit(40);
    if (query) {
      const pattern = `"%${query}%"`;
      request = request.or(`title.ilike.${pattern},slug.ilike.${pattern}`);
    }
    const { data, error } = await request;
    if (error || !Array.isArray(data)) return null;
    return data.map((row: CatalogItem) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.status,
    }));
  } catch {
    return null;
  }
}

export async function removeCatalogRecord(
  kind: CatalogKind,
  id: string
): Promise<
  | { ok: true; id: string; title: string; slug: string }
  | { ok: false; error: "unavailable" | "not_found" | "dependency" | "failed" }
> {
  const parsed = parseCatalogId(id);
  if (!parsed) return { ok: false, error: "not_found" };
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) return { ok: false, error: "unavailable" };
  try {
    const existing = await (admin.from(catalogTable(kind)) as any)
      .select("id, title, slug")
      .eq("id", parsed)
      .maybeSingle();
    if (existing.error) return { ok: false, error: "unavailable" };
    if (!existing.data?.id) return { ok: false, error: "not_found" };

    const deleted = await (admin.from(catalogTable(kind)) as any)
      .delete()
      .eq("id", parsed)
      .select("id");
    if (deleted.error) {
      const code = typeof deleted.error.code === "string" ? deleted.error.code : "";
      if (code === "23503") return { ok: false, error: "dependency" };
      return { ok: false, error: "failed" };
    }
    if (!Array.isArray(deleted.data) || deleted.data.length !== 1) {
      return { ok: false, error: "not_found" };
    }
    return {
      ok: true,
      id: parsed,
      title: String(existing.data.title || ""),
      slug: String(existing.data.slug || ""),
    };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function setTransportPublished(
  id: string,
  published: boolean
): Promise<
  | { ok: true; id: string; title: string; slug: string; status: string }
  | { ok: false; error: "unavailable" | "not_found" | "failed" }
> {
  const parsed = parseCatalogId(id);
  if (!parsed) return { ok: false, error: "not_found" };
  const admin = tryCreateAdminSupabaseClient();
  if (!admin) return { ok: false, error: "unavailable" };
  const nextStatus = published ? "published" : "paused";
  try {
    const existing = await (admin.from("transport_services") as any)
      .select("id, title, slug, status")
      .eq("id", parsed)
      .maybeSingle();
    if (existing.error) return { ok: false, error: "unavailable" };
    if (!existing.data?.id) return { ok: false, error: "not_found" };
    if (existing.data.status === "archived") return { ok: false, error: "failed" };
    if (existing.data.status !== nextStatus) {
      const updated = await (admin.from("transport_services") as any)
        .update({ status: nextStatus })
        .eq("id", parsed)
        .select("id");
      if (updated.error) return { ok: false, error: "failed" };
      if (!Array.isArray(updated.data) || updated.data.length !== 1) return { ok: false, error: "not_found" };
    }
    return {
      ok: true,
      id: parsed,
      title: String(existing.data.title || ""),
      slug: String(existing.data.slug || ""),
      status: nextStatus,
    };
  } catch {
    return { ok: false, error: "failed" };
  }
}
