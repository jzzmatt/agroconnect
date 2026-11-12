import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogRemoveButton } from "@/components/admin/CatalogRemoveButton";
import { loadAdminUser, type AdminListing } from "@/lib/admin/data";
import { writeAdminAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/access";
import { getAdminDictionary } from "@/lib/admin/locale";
import type { CatalogKind } from "@/lib/admin/catalog-target";

function ListingGroup({
  title,
  kind,
  listings,
  unavailable,
}: {
  title: string;
  kind: CatalogKind;
  listings: AdminListing[] | null;
  unavailable: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface-card p-4">
      <h2 className="font-bold">{title}</h2>
      {listings === null ? (
        <p className="mt-2 text-sm text-muted-foreground">{unavailable}</p>
      ) : listings.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">0</p>
      ) : (
        <ul className="mt-3 space-y-3 text-sm">
          {listings.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0">{item.title}</span>
              <CatalogRemoveButton kind={kind} id={item.id} title={item.title} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AdminUserPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const { locale, dict } = await getAdminDictionary();
  const actor = await requireAdmin();
  const user = await loadAdminUser(profileId);
  if (user === "unavailable") {
    return <p className="text-sm text-muted-foreground">{dict.admin.unavailable}. {dict.admin.databaseUnavailable}</p>;
  }
  if (!user) notFound();

  await writeAdminAudit({
    actorProfileId: actor.profileId,
    action: "admin.user.view",
    entityType: "profile",
    entityId: user.id,
  });

  const rows = [
    [dict.admin.email, user.email || "—"],
    [dict.admin.clerkId, user.clerkUserId],
    [dict.admin.profileId, user.id],
    [dict.admin.roles, user.roles.length > 0 ? user.roles.join(", ") : dict.admin.noRoles],
    [dict.admin.profileType, user.activeProfileType || "—"],
    [dict.admin.subscription, user.subscriptionPlan || dict.admin.noSubscription],
    [dict.admin.accountStatus, user.status || "—"],
    [dict.admin.created, new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(user.createdAt))],
  ];

  return (
    <div className="space-y-5">
      <Link href="/admin/users" className="text-sm font-semibold text-primary">
        {dict.admin.backToUsers}
      </Link>
      <h1 className="text-2xl font-bold">{user.name}</h1>
      <dl className="grid gap-3 rounded-2xl border border-border bg-surface-card p-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm break-all">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-3 lg:grid-cols-3">
        <ListingGroup title={dict.admin.publishedProducts} kind="product" listings={user.products} unavailable={dict.admin.databaseUnavailable} />
        <ListingGroup title={dict.admin.publishedServices} kind="service" listings={user.services} unavailable={dict.admin.databaseUnavailable} />
        <ListingGroup title={dict.admin.publishedCourses} kind="course" listings={user.courses} unavailable={dict.admin.databaseUnavailable} />
      </div>
    </div>
  );
}
