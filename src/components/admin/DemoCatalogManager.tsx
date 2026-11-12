"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import {
  createShowcaseBatchAction,
  removeAllDemoBatchesAction,
  removeDemoBatchAction,
  setDemoVisibilityAction,
} from "@/app/admin/actions";
import type { DemoBatchSummary } from "@/lib/admin/data";

export function DemoCatalogManager({
  enabled,
  batches,
  removableCount,
}: {
  enabled: boolean;
  batches: DemoBatchSummary[] | null;
  removableCount: number | null;
}) {
  const { dict } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        const code = result.error || "failed";
        setError(
          code === "forbidden"
            ? dict.admin.forbidden
            : code === "conflict"
              ? dict.admin.conflict
              : code === "unavailable"
                ? dict.admin.databaseUnavailable
                : dict.admin.failedAction
        );
        return;
      }
      setConfirmAll(false);
      router.refresh();
    });
  }

  const kinds = ["product", "course", "service", "provider", "media"] as const;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface-card p-4">
        <p className="text-sm text-muted-foreground">{dict.admin.demoStatus}</p>
        <p className="mt-1 text-xl font-bold">{enabled ? dict.admin.demoEnabled : dict.admin.demoDisabled}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || enabled}
            onClick={() => run(() => setDemoVisibilityAction(true))}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {dict.admin.enableDemo}
          </button>
          <button
            type="button"
            disabled={pending || !enabled}
            onClick={() => run(() => setDemoVisibilityAction(false))}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {dict.admin.disableDemo}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-card p-4">
        <h2 className="text-lg font-bold">Agroconnect Showcase</h2>
        <p className="mt-1 text-sm text-muted-foreground">{dict.admin.showcaseHelp}</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => createShowcaseBatchAction())}
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {dict.admin.createShowcase}
        </button>
      </section>

      {batches === null ? (
        <p className="text-sm text-muted-foreground">
          {dict.admin.unavailable}. {dict.admin.databaseUnavailable}
        </p>
      ) : batches.length === 0 ? (
        <p className="text-sm text-muted-foreground">{dict.admin.batchEmpty}</p>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <article key={batch.id} className="rounded-2xl border border-border bg-surface-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{batch.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {batch.status === "active" ? dict.admin.activeBatch : dict.admin.removedBatch}
                  </p>
                </div>
                {batch.status === "active" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => removeDemoBatchAction(batch.id))}
                    className="rounded-xl border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {dict.admin.removeBatch}
                  </button>
                ) : null}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                {kinds.map((kind) => (
                  <div key={kind}>
                    <dt className="text-muted-foreground">{dict.admin[kind === "product" ? "products" : kind === "course" ? "courses" : kind === "service" ? "services" : kind === "provider" ? "providers" : "media"]}</dt>
                    <dd className="font-semibold">{batch.counts[kind]}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-destructive/40 bg-surface-card p-4">
        <h2 className="font-bold text-destructive">{dict.admin.removeAll}</h2>
        <button
          type="button"
          disabled={pending || removableCount === null}
          onClick={() => setConfirmAll(true)}
          className="mt-3 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {dict.admin.removeAll}
        </button>
      </section>

      {confirmAll && removableCount !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-surface-card p-5 shadow-xl">
            <h2 className="text-lg font-bold">{dict.admin.removeAllTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {dict.admin.removeAllBody.replace("{count}", String(removableCount))}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmAll(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
                {dict.admin.cancel}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => removeAllDemoBatchesAction(removableCount))}
                className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {dict.admin.confirmRemoveAll}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
