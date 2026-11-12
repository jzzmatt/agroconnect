import "server-only";

import { resolveDemoVisibility } from "@/demo/catalog";
import { demoBucketObjectPath, isolatedDemoMediaPaths, showcaseRecords, SHOWCASE_BATCH_NAME, SHOWCASE_BATCH_SLUG } from "@/demo/showcase";
import { tryCreateAdminSupabaseClient } from "@/lib/supabase/admin";
import { createPublicServerSupabaseClient } from "@/lib/supabase/client";
import type { PublicVisit } from "@/lib/analytics/public-visit";
import { sanitizeUserSearch } from "./allowlist";
import { buildHealthReport, readHealthInputs, type HealthCheck } from "./health";

export type AdminValue = { state: "ready"; value: number } | { state: "unavailable"; reason: "database" };

const PROFILE_COLUMNS =
  "id, clerk_user_id, email, display_name, first_name, last_name, active_profile_type, subscription_plan, subscription_updated_at, account_type, status, is_active, created_at" as const;

function adminClient() {
  return tryCreateAdminSupabaseClient();
}

async function countTable(
  table: string,
  apply?: (query: any) => any
): Promise<AdminValue> {
  const admin = adminClient();
  if (!admin) return { state: "unavailable", reason: "database" };
  try {
    let query = (admin.from(table) as any).select("id", { count: "exact", head: true });
    if (apply) query = apply(query);
    const { count, error } = await query;
    if (error || typeof count !== "number") return { state: "unavailable", reason: "database" };
    return { state: "ready", value: count };
  } catch {
    return { state: "unavailable", reason: "database" };
  }
}

export async function probeDatabase(): Promise<boolean | null> {
  const inputs = readHealthInputs(null);
  if (!inputs.databaseConfigured) return null;
  const client = adminClient() || createPublicServerSupabaseClient();
  try {
    const { error } = await (client.from("profiles") as any).select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function readLastSuccess(): Promise<string | null> {
  const admin = adminClient();
  if (!admin) return null;
  try {
    const { data, error } = await (admin.from("site_settings") as any)
      .select("value")
      .eq("key", "health_last_success_at")
      .maybeSingle();
    if (error || typeof data?.value !== "string") return null;
    return data.value;
  } catch {
    return null;
  }
}

async function storeLastSuccess(value: string): Promise<void> {
  const admin = adminClient();
  if (!admin) return;
  try {
    await (admin.from("site_settings") as any).upsert(
      { key: "health_last_success_at", value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  } catch {
    return;
  }
}

export async function loadHealthReport(): Promise<{ checks: HealthCheck[]; lastSuccessAt: string | null }> {
  const reachable = await probeDatabase();
  const checks = buildHealthReport(readHealthInputs(reachable));
  const failed = checks.some((check) => check.status === "failed");
  const previous = await readLastSuccess();
  if (failed) return { checks, lastSuccessAt: previous };
  const now = new Date().toISOString();
  await storeLastSuccess(now);
  return { checks, lastSuccessAt: now };
}

export interface AdminOverview {
  users: AdminValue;
  activeUsers: AdminValue;
  products: AdminValue;
  services: AdminValue;
  courses: AdminValue;
  unreadNotifications: AdminValue;
  demoEnabled: boolean;
  health: { checks: HealthCheck[]; lastSuccessAt: string | null };
}

export async function loadAdminOverview(): Promise<AdminOverview> {
  const [users, activeUsers, products, services, courses, unreadNotifications, visibility, health] =
    await Promise.all([
      countTable("profiles"),
      countTable("profiles", (query) => query.eq("is_active", true)),
      countTable("products", (query) => query.in("status", ["published", "active"])),
      countTable("services", (query) => query.in("status", ["published", "active"])),
      countTable("courses", (query) => query.eq("status", "published")),
      countTable("notifications", (query) => query.is("read_at", null)),
      resolveDemoVisibility().then((value) => value.mode !== "none").catch(() => false),
      loadHealthReport(),
    ]);
  return { users, activeUsers, products, services, courses, unreadNotifications, demoEnabled: visibility, health };
}

export interface AdminUserSummary {
  id: string;
  clerkUserId: string;
  email: string | null;
  name: string;
  activeProfileType: string | null;
  subscriptionPlan: string | null;
  accountType: string | null;
  status: string | null;
  isActive: boolean | null;
  createdAt: string;
  roles: string[];
}

function displayName(row: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): string {
  const named = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return row.display_name || named || row.email || "—";
}

const USER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function searchAdminUsers(rawQuery: string): Promise<AdminUserSummary[] | null> {
  const admin = adminClient();
  if (!admin) return null;
  const term = sanitizeUserSearch(rawQuery);
  try {
    let query = (admin.from("profiles") as any).select(PROFILE_COLUMNS).order("created_at", { ascending: false }).limit(40);
    if (term) {
      const clauses = [
        `display_name.ilike.%${term}%`,
        `email.ilike.%${term}%`,
        `clerk_user_id.ilike.%${term}%`,
        `first_name.ilike.%${term}%`,
        `last_name.ilike.%${term}%`,
      ];
      if (USER_UUID.test(term)) clauses.push(`id.eq.${term}`);
      query = query.or(clauses.join(","));
    }
    const { data, error } = await query;
    if (error || !data) return null;
    const ids = data.map((row: { id: string }) => row.id);
    const rolesByProfile = new Map<string, string[]>();
    if (ids.length > 0) {
      const roles = await (admin.from("user_roles") as any).select("profile_id, role").in("profile_id", ids);
      for (const role of roles.data || []) {
        const list = rolesByProfile.get(role.profile_id) || [];
        list.push(role.role);
        rolesByProfile.set(role.profile_id, list);
      }
    }
    return data.map((row: {
      id: string;
      clerk_user_id: string;
      email: string | null;
      display_name: string | null;
      first_name: string | null;
      last_name: string | null;
      active_profile_type: string | null;
      subscription_plan: string | null;
      account_type: string | null;
      status: string | null;
      is_active: boolean | null;
      created_at: string;
    }) => ({
      id: row.id,
      clerkUserId: row.clerk_user_id,
      email: row.email,
      name: displayName(row),
      activeProfileType: row.active_profile_type,
      subscriptionPlan: row.subscription_plan,
      accountType: row.account_type,
      status: row.status,
      isActive: row.is_active,
      createdAt: row.created_at,
      roles: rolesByProfile.get(row.id) || [],
    }));
  } catch {
    return null;
  }
}

export interface AdminListing {
  id: string;
  title: string;
  slug: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  subscriptionUpdatedAt: string | null;
  products: AdminListing[] | null;
  services: AdminListing[] | null;
  courses: AdminListing[] | null;
  transports: AdminListing[] | null;
}

export async function loadAdminUser(profileId: string): Promise<AdminUserDetail | null | "unavailable"> {
  if (!USER_UUID.test(profileId)) return null;
  const admin = adminClient();
  if (!admin) return "unavailable";
  try {
    const { data, error } = await (admin.from("profiles") as any).select(PROFILE_COLUMNS).eq("id", profileId).maybeSingle();
    if (error) return "unavailable";
    if (!data) return null;
    const roles = await (admin.from("user_roles") as any).select("role").eq("profile_id", profileId);
    const providers = await (admin.from("provider_profiles") as any).select("id").eq("profile_id", profileId);
    const providerIds = (providers.data || []).map((row: { id: string }) => row.id);
    const [products, services, courses, transports] = await Promise.all([
      providerIds.length === 0
        ? Promise.resolve({ data: [] as AdminListing[], error: null })
        : (admin.from("products") as any)
            .select("id, title, slug")
            .in("seller_id", providerIds)
            .in("status", ["published", "active"])
            .limit(20),
      providerIds.length === 0
        ? Promise.resolve({ data: [] as AdminListing[], error: null })
        : (admin.from("services") as any)
            .select("id, title, slug")
            .in("provider_id", providerIds)
            .in("status", ["published", "active"])
            .limit(20),
      (admin.from("courses") as any).select("id, title, slug").eq("owner_id", profileId).eq("status", "published").limit(20),
      providerIds.length === 0
        ? Promise.resolve({ data: [] as AdminListing[], error: null })
        : (admin.from("transport_services") as any)
            .select("id, title, slug")
            .in("provider_id", providerIds)
            .eq("status", "published")
            .limit(20),
    ]);
    return {
      id: data.id,
      clerkUserId: data.clerk_user_id,
      email: data.email,
      name: displayName(data),
      activeProfileType: data.active_profile_type,
      subscriptionPlan: data.subscription_plan,
      subscriptionUpdatedAt: data.subscription_updated_at,
      accountType: data.account_type,
      status: data.status,
      isActive: data.is_active,
      createdAt: data.created_at,
      roles: (roles.data || []).map((row: { role: string }) => row.role),
      products: products.error ? null : (products.data || []).map((row: AdminListing) => ({ id: row.id, title: row.title, slug: row.slug })),
      services: services.error ? null : (services.data || []).map((row: AdminListing) => ({ id: row.id, title: row.title, slug: row.slug })),
      courses: courses.error ? null : (courses.data || []).map((row: AdminListing) => ({ id: row.id, title: row.title, slug: row.slug })),
      transports: transports.error ? null : (transports.data || []).map((row: AdminListing) => ({ id: row.id, title: row.title, slug: row.slug })),
    };
  } catch {
    return "unavailable";
  }
}

export interface VisitStats {
  days: 7 | 30 | 90;
  total: AdminValue;
  uniqueVisitors: AdminValue;
  byDate: Array<{ date: string; visits: number }> | null;
  routes: Array<{ route: string; visits: number }> | null;
  marketplaces: Record<"agrishopping" | "agriacademy" | "agriservice", number> | null;
}

export async function loadVisitStats(days: 7 | 30 | 90): Promise<VisitStats> {
  const empty: VisitStats = {
    days,
    total: { state: "unavailable", reason: "database" },
    uniqueVisitors: { state: "unavailable", reason: "database" },
    byDate: null,
    routes: null,
    marketplaces: null,
  };
  const admin = adminClient();
  if (!admin) return empty;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const sinceDate = since.toISOString().slice(0, 10);
  try {
    const { count, error } = await (admin.from("page_visits") as any)
      .select("id", { count: "exact", head: true })
      .gte("visited_on", sinceDate);
    if (error || typeof count !== "number") return empty;
    const pageSize = 1000;
    const rows: Array<{ visited_on: string; route: string; visitor_id: string; marketplace: string | null }> = [];
    for (let from = 0; from < count && from < 5000; from += pageSize) {
      const page = await (admin.from("page_visits") as any)
        .select("visited_on, route, visitor_id, marketplace")
        .gte("visited_on", sinceDate)
        .order("visited_on", { ascending: false })
        .range(from, from + pageSize - 1);
      if (page.error || !Array.isArray(page.data)) return { ...empty, total: { state: "ready", value: count } };
      rows.push(...page.data);
      if (page.data.length < pageSize) break;
    }
    const truncated = rows.length < count;
    const visitors = new Set(rows.map((row) => row.visitor_id));
    const byDate = new Map<string, number>();
    const byRoute = new Map<string, number>();
    const marketplaces = { agrishopping: 0, agriacademy: 0, agriservice: 0 };
    for (const row of rows) {
      byDate.set(row.visited_on, (byDate.get(row.visited_on) || 0) + 1);
      byRoute.set(row.route, (byRoute.get(row.route) || 0) + 1);
      if (row.marketplace === "agrishopping" || row.marketplace === "agriacademy" || row.marketplace === "agriservice") {
        marketplaces[row.marketplace] += 1;
      }
    }
    return {
      days,
      total: { state: "ready", value: count },
      uniqueVisitors: truncated ? { state: "unavailable", reason: "database" } : { state: "ready", value: visitors.size },
      byDate: truncated ? null : [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, visits]) => ({ date, visits })),
      routes: truncated
        ? null
        : [...byRoute.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([route, visits]) => ({ route, visits })),
      marketplaces: truncated ? null : marketplaces,
    };
  } catch {
    return empty;
  }
}

export async function recordPublicVisit(visit: PublicVisit): Promise<void> {
  const admin = adminClient();
  if (!admin) return;
  try {
    await (admin.from("page_visits") as any).insert({
      visited_on: visit.visitedOn,
      route: visit.route,
      visitor_id: visit.visitorId,
      marketplace: visit.marketplace,
    });
  } catch {
    return;
  }
}

export interface DemoBatchSummary {
  id: string;
  slug: string;
  name: string;
  status: string;
  createdAt: string;
  counts: Record<"product" | "course" | "service" | "provider" | "media", number>;
}

export async function loadDemoCatalogAdmin(): Promise<{
  enabled: boolean;
  batches: DemoBatchSummary[] | null;
  removableCount: number | null;
}> {
  const visibility = await resolveDemoVisibility().catch(() => ({ mode: "none" as const }));
  const admin = adminClient();
  if (!admin) return { enabled: visibility.mode !== "none", batches: null, removableCount: null };
  try {
    const [batchesResult, recordsResult, settingResult] = await Promise.all([
      (admin.from("demo_batches") as any).select("id, slug, name, status, created_at").order("created_at", { ascending: false }),
      (admin.from("demo_batch_records") as any).select("demo_batch_id, record_kind").eq("is_demo", true),
      (admin.from("site_settings") as any).select("value").eq("key", "demo_catalog_enabled").maybeSingle(),
    ]);
    if (batchesResult.error || recordsResult.error) {
      return { enabled: visibility.mode !== "none", batches: null, removableCount: null };
    }
    const counts = new Map<string, DemoBatchSummary["counts"]>();
    for (const record of recordsResult.data || []) {
      const current = counts.get(record.demo_batch_id) || { product: 0, course: 0, service: 0, provider: 0, media: 0 };
      if (record.record_kind in current) current[record.record_kind as keyof typeof current] += 1;
      counts.set(record.demo_batch_id, current);
    }
    const batches: DemoBatchSummary[] = (batchesResult.data || []).map((batch: any) => ({
      id: String(batch.id),
      slug: String(batch.slug),
      name: String(batch.name),
      status: String(batch.status),
      createdAt: String(batch.created_at),
      counts: counts.get(batch.id) || { product: 0, course: 0, service: 0, provider: 0, media: 0 },
    }));
    const removableCount = (recordsResult.data || []).length;
    const explicit = settingResult.data?.value;
    const enabled = explicit === "true" ? true : explicit === "false" ? false : visibility.mode !== "none";
    return { enabled, batches, removableCount };
  } catch {
    return { enabled: visibility.mode !== "none", batches: null, removableCount: null };
  }
}

export async function setDemoCatalogEnabled(enabled: boolean, actorProfileId: string | null) {
  const admin = adminClient();
  if (!admin) return { ok: false as const, error: "unavailable" as const };
  const { error } = await (admin.from("site_settings") as any).upsert(
    {
      key: "demo_catalog_enabled",
      value: enabled ? "true" : "false",
      updated_at: new Date().toISOString(),
      updated_by: actorProfileId,
    },
    { onConflict: "key" }
  );
  if (error) return { ok: false as const, error: "failed" as const };
  return { ok: true as const };
}

export async function createShowcaseBatch(actorProfileId: string | null) {
  const admin = adminClient();
  if (!admin) return { ok: false as const, error: "unavailable" as const };
  const existing = await (admin.from("demo_batches") as any)
    .select("id")
    .eq("slug", SHOWCASE_BATCH_SLUG)
    .eq("status", "active")
    .maybeSingle();
  if (existing.error) return { ok: false as const, error: "failed" as const };
  let batchId = existing.data?.id as string | undefined;
  if (!batchId) {
    const inserted = await (admin.from("demo_batches") as any)
      .insert({
        slug: SHOWCASE_BATCH_SLUG,
        name: SHOWCASE_BATCH_NAME,
        status: "active",
        created_by: actorProfileId,
      })
      .select("id")
      .single();
    if (inserted.data?.id) {
      batchId = inserted.data.id;
    } else {
      const again = await (admin.from("demo_batches") as any)
        .select("id")
        .eq("slug", SHOWCASE_BATCH_SLUG)
        .eq("status", "active")
        .maybeSingle();
      if (!again.data?.id) return { ok: false as const, error: "failed" as const };
      batchId = again.data.id;
    }
  }
  const payload = showcaseRecords().map((record) => ({
    demo_batch_id: batchId,
    record_kind: record.recordKind,
    record_key: record.recordKey,
    media_path: record.mediaPath,
    is_demo: true,
  }));
  const saved = await (admin.from("demo_batch_records") as any).upsert(payload, {
    onConflict: "demo_batch_id,record_kind,record_key",
    ignoreDuplicates: true,
  });
  if (saved.error) return { ok: false as const, error: "failed" as const };
  return { ok: true as const, batchId: batchId! };
}

async function deleteDemoMedia(paths: Array<string | null>) {
  const objects = isolatedDemoMediaPaths(paths)
    .map((path) => demoBucketObjectPath(path))
    .filter((path): path is string => Boolean(path));
  if (objects.length === 0) return;
  const admin = adminClient();
  if (!admin) return;
  try {
    await admin.storage.from("demo").remove(objects);
  } catch {
    return;
  }
}

export async function removeDemoBatch(batchId: string) {
  if (!USER_UUID.test(batchId)) return { ok: false as const, error: "failed" as const };
  const admin = adminClient();
  if (!admin) return { ok: false as const, error: "unavailable" as const };
  const records = await (admin.from("demo_batch_records") as any)
    .select("id, media_path, is_demo")
    .eq("demo_batch_id", batchId)
    .eq("is_demo", true);
  if (records.error) return { ok: false as const, error: "failed" as const };
  const rows = (records.data || []).filter((row: { is_demo: boolean }) => row.is_demo === true);
  if (rows.length > 0) {
    const deleted = await (admin.from("demo_batch_records") as any)
      .delete()
      .eq("demo_batch_id", batchId)
      .eq("is_demo", true);
    if (deleted.error) return { ok: false as const, error: "failed" as const };
  }
  const updated = await (admin.from("demo_batches") as any)
    .update({ status: "removed", removed_at: new Date().toISOString() })
    .eq("id", batchId)
    .eq("status", "active");
  if (updated.error) return { ok: false as const, error: "failed" as const };
  await deleteDemoMedia(rows.map((row: { media_path: string | null }) => row.media_path));
  return { ok: true as const, count: rows.length };
}

export async function removeAllDemoBatches(expectedCount: number) {
  const admin = adminClient();
  if (!admin) return { ok: false as const, error: "unavailable" as const };
  const records = await (admin.from("demo_batch_records") as any).select("id, media_path, is_demo").eq("is_demo", true);
  if (records.error) return { ok: false as const, error: "failed" as const };
  const rows = (records.data || []).filter((row: { is_demo: boolean }) => row.is_demo === true);
  if (rows.length !== expectedCount) return { ok: false as const, error: "conflict" as const };
  if (rows.length > 0) {
    const deleted = await (admin.from("demo_batch_records") as any).delete().eq("is_demo", true);
    if (deleted.error) return { ok: false as const, error: "failed" as const };
  }
  const updated = await (admin.from("demo_batches") as any)
    .update({ status: "removed", removed_at: new Date().toISOString() })
    .eq("status", "active");
  if (updated.error) return { ok: false as const, error: "failed" as const };
  await deleteDemoMedia(rows.map((row: { media_path: string | null }) => row.media_path));
  return { ok: true as const, count: rows.length };
}
