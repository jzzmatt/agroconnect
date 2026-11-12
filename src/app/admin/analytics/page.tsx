import Link from "next/link";
import { loadVisitStats, type AdminValue } from "@/lib/admin/data";
import { getAdminDictionary } from "@/lib/admin/locale";

function daysFrom(value: string | undefined): 7 | 30 | 90 {
  if (value === "30") return 30;
  if (value === "90") return 90;
  return 7;
}

function Value({ metric, unavailable, reason }: { metric: AdminValue; unavailable: string; reason: string }) {
  if (metric.state === "unavailable") {
    return (
      <p>
        <span className="text-2xl font-bold">{unavailable}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{reason}</span>
      </p>
    );
  }
  return <p className="text-2xl font-bold">{metric.value}</p>;
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { dict } = await getAdminDictionary();
  const params = await searchParams;
  const days = daysFrom(typeof params.days === "string" ? params.days : undefined);
  const stats = await loadVisitStats(days);
  const filters = [
    { days: 7, label: dict.admin.days7 },
    { days: 30, label: dict.admin.days30 },
    { days: 90, label: dict.admin.days90 },
  ] as const;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{dict.admin.analytics}</h1>
      <div className="flex gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.days}
            href={`/admin/analytics?days=${filter.days}`}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${filter.days === days ? "bg-primary text-primary-foreground" : "border border-border"}`}
          >
            {filter.label}
          </Link>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dict.admin.totalVisits}</p>
          <Value metric={stats.total} unavailable={dict.admin.unavailable} reason={dict.admin.databaseUnavailable} />
        </section>
        <section className="rounded-2xl border border-border bg-surface-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dict.admin.uniqueVisitors}</p>
          <Value metric={stats.uniqueVisitors} unavailable={dict.admin.unavailable} reason={dict.admin.databaseUnavailable} />
        </section>
      </div>
      <section className="rounded-2xl border border-border bg-surface-card p-4">
        <h2 className="font-bold">{dict.admin.visitsByDate}</h2>
        {stats.byDate === null ? (
          <p className="mt-2 text-sm text-muted-foreground">{dict.admin.unavailable}. {dict.admin.databaseUnavailable}</p>
        ) : stats.byDate.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{dict.admin.noVisits}</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {stats.byDate.map((row) => (
              <li key={row.date} className="flex justify-between gap-3">
                <span>{row.date}</span>
                <span className="font-semibold">{row.visits}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-surface-card p-4">
        <h2 className="font-bold">{dict.admin.topRoutes}</h2>
        {stats.routes === null ? (
          <p className="mt-2 text-sm text-muted-foreground">{dict.admin.unavailable}. {dict.admin.databaseUnavailable}</p>
        ) : stats.routes.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{dict.admin.noVisits}</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {stats.routes.map((row) => (
              <li key={row.route} className="flex justify-between gap-3">
                <span className="truncate">{row.route}</span>
                <span className="font-semibold">{row.visits}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-surface-card p-4">
        <h2 className="font-bold">{dict.admin.marketplaceVisits}</h2>
        {stats.marketplaces === null ? (
          <p className="mt-2 text-sm text-muted-foreground">{dict.admin.unavailable}. {dict.admin.databaseUnavailable}</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            <li className="flex justify-between"><span>AgriProduct</span><span className="font-semibold">{stats.marketplaces.agrishopping}</span></li>
            <li className="flex justify-between"><span>AgriAcademy</span><span className="font-semibold">{stats.marketplaces.agriacademy}</span></li>
            <li className="flex justify-between"><span>AgriService</span><span className="font-semibold">{stats.marketplaces.agriservice}</span></li>
          </ul>
        )}
      </section>
    </div>
  );
}
