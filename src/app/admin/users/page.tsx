import Link from "next/link";
import { sanitizeUserSearch } from "@/lib/admin/allowlist";
import { searchAdminUsers } from "@/lib/admin/data";
import { getAdminDictionary } from "@/lib/admin/locale";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, dict } = await getAdminDictionary();
  const params = await searchParams;
  const raw = typeof params.q === "string" ? params.q : "";
  const query = sanitizeUserSearch(raw);
  const users = await searchAdminUsers(query);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{dict.admin.users}</h1>
      <form action="/admin/users" className="flex flex-col gap-2 sm:flex-row">
        <input
          name="q"
          defaultValue={query}
          placeholder={dict.admin.searchUsers}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          {dict.admin.search}
        </button>
      </form>
      {users === null ? (
        <p className="text-sm text-muted-foreground">
          {dict.admin.unavailable}. {dict.admin.databaseUnavailable}
        </p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">{dict.admin.noUsers}</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface-card">
          {users.map((user) => (
            <li key={user.id}>
              <Link href={`/admin/users/${user.id}`} className="block px-4 py-3 hover:bg-muted">
                <span className="font-semibold">{user.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{user.email || user.clerkUserId}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {user.subscriptionPlan || dict.admin.noSubscription} ·{" "}
                  {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(user.createdAt))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
