"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeAccountAction, setAccountActiveAction } from "@/app/admin/actions";
import { useI18n } from "@/i18n/provider";

export function AccountControls({
  profileId,
  name,
  closed,
}: {
  profileId: string;
  name: string;
  closed: boolean;
}) {
  const { dict } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"visibility" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function message(code: string) {
    if (code === "forbidden") return dict.admin.forbidden;
    if (code === "protected") return dict.admin.protectedAccount;
    if (code === "not_found") return dict.admin.itemNotFound;
    if (code === "dependency") return dict.admin.accountDependency;
    if (code === "unavailable") return dict.admin.databaseUnavailable;
    return dict.admin.failedAction;
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>, leaving: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(message(result.error || "failed"));
        return;
      }
      setMode(null);
      if (leaving) router.push("/admin/users");
      else router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-card p-4">
      <h2 className="font-bold">{dict.admin.accountActions}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode("visibility");
          }}
          className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold"
        >
          {closed ? dict.admin.activateAccount : dict.admin.deactivateAccount}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode("remove");
          }}
          className="rounded-xl border border-destructive px-3 py-1.5 text-sm font-semibold text-destructive"
        >
          {dict.admin.removeAccount}
        </button>
      </div>
      {mode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-card p-5">
            <h2 className="text-lg font-bold">
              {mode === "remove"
                ? dict.admin.removeAccountTitle
                : closed
                  ? dict.admin.activateAccountTitle
                  : dict.admin.deactivateAccountTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "remove"
                ? dict.admin.removeAccountBody.replace("{name}", name)
                : closed
                  ? dict.admin.activateAccountBody
                  : dict.admin.deactivateAccountBody}
            </p>
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setMode(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {dict.admin.cancel}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(
                    mode === "remove" ? () => removeAccountAction(profileId) : () => setAccountActiveAction(profileId, closed),
                    mode === "remove"
                  )
                }
                className={
                  mode === "remove"
                    ? "rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    : "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                }
              >
                {mode === "remove"
                  ? dict.admin.removeAccount
                  : closed
                    ? dict.admin.activateAccount
                    : dict.admin.deactivateAccount}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
