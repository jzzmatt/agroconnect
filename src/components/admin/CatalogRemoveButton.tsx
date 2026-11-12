"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeCatalogItemAction } from "@/app/admin/actions";
import { useI18n } from "@/i18n/provider";
import type { CatalogKind } from "@/lib/admin/catalog-target";

export function CatalogRemoveButton({
  kind,
  id,
  title,
}: {
  kind: CatalogKind;
  id: string;
  title: string;
}) {
  const { dict } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await removeCatalogItemAction(kind, id);
      if (!result.ok) {
        const code = result.error;
        setError(
          code === "forbidden"
            ? dict.admin.forbidden
            : code === "not_found"
              ? dict.admin.itemNotFound
              : code === "dependency"
                ? dict.admin.itemDependency
                : code === "unavailable"
                  ? dict.admin.databaseUnavailable
                  : dict.admin.failedAction
        );
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="rounded-xl border border-destructive px-3 py-1.5 text-sm font-semibold text-destructive"
      >
        {dict.admin.removeItem}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-card p-5">
            <h2 className="text-lg font-bold">{dict.admin.removeItemTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {dict.admin.removeItemBody.replace("{title}", title)}{" "}
              {kind === "course"
                ? dict.admin.removeCourseNote
                : kind === "service"
                  ? dict.admin.removeServiceNote
                  : dict.admin.removeProductNote}
            </p>
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {dict.admin.cancel}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={remove}
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {dict.admin.confirmRemove}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
