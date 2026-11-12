import { refreshHealthAction } from "@/app/admin/actions";
import { loadHealthReport } from "@/lib/admin/data";
import { getAdminDictionary } from "@/lib/admin/locale";

export default async function AdminHealthPage() {
  const { locale, dict } = await getAdminDictionary();
  const report = await loadHealthReport();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{dict.admin.health}</h1>
        <form action={refreshHealthAction}>
          <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            {dict.admin.refresh}
          </button>
        </form>
      </div>
      <p className="text-sm text-muted-foreground">
        {dict.admin.lastCheck}:{" "}
        {report.lastSuccessAt
          ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.lastSuccessAt))
          : dict.admin.noSuccessfulCheck}
      </p>
      <ul className="space-y-3">
        {report.checks.map((check) => (
          <li key={check.id} className="rounded-2xl border border-border bg-surface-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">{dict.admin.checks[check.id]}</h2>
              <span className="text-xs font-bold uppercase tracking-wide">
                {check.status === "pass" ? dict.admin.pass : check.status === "warning" ? dict.admin.warning : dict.admin.failed}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{dict.admin.reasons[check.reason]}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
