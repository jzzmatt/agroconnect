import { listCatalogItems } from "@/lib/admin/catalog";
import { parseCatalogKind, sanitizeCatalogSearch, type CatalogKind } from "@/lib/admin/catalog-target";
import { getAdminDictionary } from "@/lib/admin/locale";
import { CatalogRemoveButton } from "@/components/admin/CatalogRemoveButton";

const KINDS: CatalogKind[] = ["product", "course", "service", "transport"];

function kindLabel(
  kind: CatalogKind,
  labels: { products: string; courses: string; services: string; transports: string }
) {
  if (kind === "course") return labels.courses;
  if (kind === "service") return labels.services;
  if (kind === "transport") return labels.transports;
  return labels.products;
}

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { dict } = await getAdminDictionary();
  const params = await searchParams;
  const kind = parseCatalogKind(typeof params.kind === "string" ? params.kind : undefined);
  const query = sanitizeCatalogSearch(typeof params.q === "string" ? params.q : "");
  const items = await listCatalogItems(kind, query);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{dict.admin.catalog}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{dict.admin.catalogHelp}</p>
      </div>
      <form action="/admin/catalog" className="flex flex-col gap-2 sm:flex-row">
        <select
          name="kind"
          defaultValue={kind}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          {KINDS.map((option) => (
            <option key={option} value={option}>
              {kindLabel(option, dict.admin)}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={query}
          placeholder={dict.admin.searchCatalog}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          {dict.admin.search}
        </button>
      </form>
      {items === null ? (
        <p className="text-sm text-muted-foreground">
          {dict.admin.unavailable}. {dict.admin.databaseUnavailable}
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{dict.admin.noCatalogItems}</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface-card">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {item.slug} · {item.status}
                </p>
              </div>
              <CatalogRemoveButton kind={kind} id={item.id} title={item.title} status={item.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
