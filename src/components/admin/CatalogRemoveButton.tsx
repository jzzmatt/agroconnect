"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeCatalogItemAction, setTransportActiveAction } from "@/app/admin/actions";
import { useI18n } from "@/i18n/provider";
import type { CatalogKind } from "@/lib/admin/catalog-target";

export function CatalogRemoveButton({
  kind,
  id,
  title,
  status,
}: {
  kind: CatalogKind;
  id: string;
  title: string;
  status?: string;
}) {
  const { dict } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<"remove" | "visibility" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const transportPaused = kind === "transport" && status === "paused";
  const transportArchived = kind === "transport" && status === "archived";

  function message(code: string) {
    if (code === "forbidden") return dict.admin.forbidden;
    if (code === "not_found") return dict.admin.itemNotFound;
    if (code === "dependency") return dict.admin.itemDependency;
    if (code === "unavailable") return dict.admin.databaseUnavailable;
    return dict.admin.failedAction;
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await removeCatalogItemAction(kind, id);
      if (!result.ok) {
        const code = result.error;
        setError(message(code));
        return;
      }
      setOpen(null);
      router.refresh();
    });
  }

  function changeVisibility() {
    setError(null);
    startTransition(async () => {
      const result = await setTransportActiveAction(id, transportPaused);
      if (!result.ok) {
        setError(message(result.error));
        return;
      }
      setOpen(null);
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 gap-2">
      {kind === "transport" && !transportArchived ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen("visibility");
          }}
          className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold"
        >
          {transportPaused ? dict.admin.activateItem : dict.admin.deactivateItem}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen("remove");
        }}
        className="rounded-xl border border-destructive px-3 py-1.5 text-sm font-semibold text-destructive"
      >
        {dict.admin.removeItem}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-card p-5">
            <h2 className="text-lg font-bold">
              {open === "visibility"
                ? transportPaused
                  ? dict.admin.activateTransportTitle
                  : dict.admin.deactivateTransportTitle
                : dict.admin.removeItemTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {open === "visibility"
                ? transportPaused
                  ? dict.admin.activateTransportBody
                  : dict.admin.deactivateTransportBody
                : `${dict.admin.removeItemBody.replace("{title}", title)} ${
                    kind === "course"
                      ? dict.admin.removeCourseNote
                      : kind === "service"
                        ? dict.admin.removeServiceNote
                        : kind === "transport"
                          ? dict.admin.removeTransportNote
                          : dict.admin.removeProductNote
                  }`}
            </p>
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {dict.admin.cancel}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={open === "visibility" ? changeVisibility : remove}
                className={
                  open === "visibility"
                    ? "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    : "rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                }
              >
                {open === "visibility"
                  ? transportPaused
                    ? dict.admin.activateItem
                    : dict.admin.deactivateItem
                  : dict.admin.confirmRemove}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
