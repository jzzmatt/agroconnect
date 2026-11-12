import Link from "next/link";
import { loadAdminOverview, type AdminValue } from "@/lib/admin/data";
import { getAdminDictionary } from "@/lib/admin/locale";

function Metric({
  label,
  metric,
  unavailable,
  reason,
}: {
  label: string;
  metric: AdminValue;
  unavailable: string;
  reason: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{metric.state === "ready" ? metric.value : unavailable}</p>
      {metric.state === "unavailable" ? <p className="mt-1 text-sm text-muted-foreground">{reason}</p> : null}
    </section>
  );
}

export default async function AdminOverviewPage() {
  const { locale, dict } = await getAdminDictionary();
  const overview = await loadAdminOverview();
  const failed = overview.health.checks.filter((check) => check.status === "failed").length;
  const warnings = overview.health.checks.filter((check) => check.status === "warning").length;
  const passing = overview.health.checks.filter((check) => check.status === "pass").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{dict.admin.overview}</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label={dict.admin.totalUsers} metric={overview.users} unavailable={dict.admin.unavailable} reason={dict.admin.databaseUnavailable} />
        <Metric label={dict.admin.activeUsers} metric={overview.activeUsers} unavailable={dict.admin.unavailable} reason={dict.admin.databaseUnavailable} />
        <Metric label={dict.admin.publishedProducts} metric={overview.products} unavailable={dict.admin.unavailable} reason={dict.admin.databaseUnavailable} />
        <Metric label={dict.admin.publishedServices} metric={overview.services} unavailable={dict.admin.unavailable} reason={dict.admin.databaseUnavailable} />
        <Metric label={dict.admin.publishedCourses} metric={overview.courses} unavailable={dict.admin.unavailable} reason={dict.admin.databaseUnavailable} />
        <Metric label={dict.admin.unreadNotifications} metric={overview.unreadNotifications} unavailable={dict.admin.unavailable} reason={dict.admin.databaseUnavailable} />
      </div>
      <section className="rounded-2xl border border-border bg-surface-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dict.admin.demoStatus}</p>
        <p className="mt-2 text-xl font-bold">{overview.demoEnabled ? dict.admin.demoEnabled : dict.admin.demoDisabled}</p>
      </section>
      <section className="rounded-2xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">{dict.admin.healthSummary}</h2>
          <Link href="/admin/health" className="text-sm font-semibold text-primary">
            {dict.admin.health}
          </Link>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {dict.admin.pass}: {passing} · {dict.admin.warning}: {warnings} · {dict.admin.failed}: {failed}
        </p>
        <p className="mt-2 text-sm">
          {dict.admin.lastCheck}:{" "}
          {overview.health.lastSuccessAt
            ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(overview.health.lastSuccessAt))
            : dict.admin.noSuccessfulCheck}
        </p>
      </section>
    </div>
  );
}
