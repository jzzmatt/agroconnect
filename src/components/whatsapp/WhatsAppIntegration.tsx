"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import type { Dictionary } from "@/i18n";
import { searchGroups } from "@/lib/whatsapp/model";
import type { PublicConnection, PublicGroup } from "@/lib/whatsapp/types";
import { QrConnectModal } from "./QrConnectModal";

const EMPTY: PublicConnection = {
  status: "not_connected",
  phone: null,
  connectedAt: null,
  savedGroupCount: 0,
  updatedAt: null,
  qrVersion: 0,
};

type Copy = Dictionary["whatsapp"];

function statusLabel(copy: Copy, status: PublicConnection["status"]): string {
  if (status === "qr_pending") return copy.statusQr;
  if (status === "connecting") return copy.statusConnecting;
  if (status === "connected") return copy.statusConnected;
  if (status === "disconnected") return copy.statusDisconnected;
  if (status === "auth_failure") return copy.statusAuthFailure;
  return copy.statusNotConnected;
}

function errorLabel(copy: Copy, code: string): string {
  if (code === "PROVIDER_PAYMENT") return copy.errorPayment;
  if (code === "PROVIDER_CONFLICT") return copy.errorConflict;
  if (code === "RATE_LIMITED") return copy.errorRate;
  if (code === "NOT_CONFIGURED" || code === "PROVIDER_AUTH") return copy.errorConfig;
  if (code === "AUTH_REQUIRED") return copy.errorUnauthorized;
  if (code === "PERMISSION_DENIED" || code === "ENTITLEMENT_REQUIRED") return copy.errorForbidden;
  if (code === "auth_failure") return copy.errorAuth;
  return copy.errorGeneric;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || "UNEXPECTED");
  }
  return body;
}

export function WhatsAppIntegration() {
  const { dict } = useI18n();
  const copy = dict.whatsapp;
  const [connection, setConnection] = useState<PublicConnection>(EMPTY);
  const [groups, setGroups] = useState<PublicGroup[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrShownAt, setQrShownAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const loadGroups = useCallback(async () => {
    const body = await readJson<{ groups: PublicGroup[] }>(await fetch("/api/whatsapp/groups"));
    setGroups(body.groups);
  }, []);

  const load = useCallback(async () => {
    const body = await readJson<{ connection: PublicConnection }>(
      await fetch("/api/whatsapp/connection")
    );
    setConnection(body.connection);
    if (body.connection.status !== "not_connected") {
      try {
        await loadGroups();
      } catch {
        setGroups([]);
      }
    }
  }, [loadGroups]);

  useEffect(() => {
    let cancelled = false;
    load()
      .catch((reason: Error) => {
        if (!cancelled) setError(errorLabel(copy, reason.message));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load, copy]);

  useEffect(() => {
    if (!qrOpen) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [qrOpen]);

  useEffect(() => {
    if (!qrOpen) return;
    let cancelled = false;
    const poll = window.setInterval(() => {
      fetch("/api/whatsapp/refresh", { method: "POST" })
        .then((response) => readJson<{ connection: PublicConnection }>(response))
        .then(async (body) => {
          if (cancelled) return;
          setConnection(body.connection);
          if (body.connection.status === "connected") {
            setQrOpen(false);
            setQrCode(null);
            await loadGroups().catch(() => undefined);
          } else if (
            body.connection.status === "qr_pending" &&
            body.connection.qrVersion !== connection.qrVersion
          ) {
            const qr = await readJson<{ qrCode: string | null; connection: PublicConnection }>(
              await fetch("/api/whatsapp/qr", { method: "POST" })
            );
            if (cancelled || !qr.qrCode) return;
            setQrCode(qr.qrCode);
            setQrShownAt(Date.now());
            setConnection(qr.connection);
          } else if (body.connection.status === "auth_failure") {
            setError(copy.errorAuth);
          }
        })
        .catch(() => undefined);
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [qrOpen, connection.qrVersion, loadGroups, copy.errorAuth]);

  const visibleGroups = useMemo(() => searchGroups(groups, query), [groups, query]);
  const expired = qrShownAt !== null && now - qrShownAt >= 45_000;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (reason) {
      setError(errorLabel(copy, reason instanceof Error ? reason.message : "UNEXPECTED"));
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    await run(async () => {
      const body = await readJson<{
        connection: PublicConnection;
        qrCode: string | null;
        pending: boolean;
      }>(await fetch("/api/whatsapp/connect", { method: "POST" }));
      setConnection(body.connection);
      setQrCode(body.qrCode);
      setQrShownAt(body.qrCode ? Date.now() : null);
      setQrOpen(true);
    });
  }

  const connected = connection.status === "connected";
  const reconnect = connection.status === "disconnected" || connection.status === "auth_failure";

  return (
    <section className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageCircle className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-surface p-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">{copy.loading}</p>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{copy.title}</dt>
              <dd className="mt-1 text-base font-semibold">{statusLabel(copy, connection.status)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{copy.phoneLabel}</dt>
              <dd className="mt-1 text-base font-semibold">{connection.phone || copy.phoneEmpty}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{copy.connectedAt}</dt>
              <dd className="mt-1 text-base font-semibold">
                {connection.connectedAt
                  ? new Date(connection.connectedAt).toLocaleString("pt-AO")
                  : copy.phoneEmpty}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{copy.savedCount}</dt>
              <dd className="mt-1 text-base font-semibold">{connection.savedGroupCount}</dd>
            </div>
          </dl>
        )}

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {!connected ? (
            <Button type="button" onClick={connect} disabled={busy || loading}>
              {reconnect ? copy.reconnect : copy.connect}
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  if (!window.confirm(copy.confirmDisconnect)) return;
                  const body = await readJson<{ connection: PublicConnection }>(
                    await fetch("/api/whatsapp/disconnect", { method: "POST" })
                  );
                  setConnection(body.connection);
                  setQrOpen(false);
                })
              }
            >
              {copy.disconnect}
            </Button>
          )}
          {connection.status !== "not_connected" ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const body = await readJson<{ connection: PublicConnection }>(
                    await fetch("/api/whatsapp/refresh", { method: "POST" })
                  );
                  setConnection(body.connection);
                })
              }
            >
              {copy.refresh}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById("whatsapp-groups")?.scrollIntoView({ behavior: "smooth" })}
          >
            {copy.manageGroups}
          </Button>
        </div>
      </div>

      <div id="whatsapp-groups" className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{copy.groupsTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.groupsHelp}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !connected}
            onClick={() => run(loadGroups)}
          >
            {copy.refreshGroups}
          </Button>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.searchPlaceholder}
          className="mt-4 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
        />
        {visibleGroups.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{copy.noGroups}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {visibleGroups.map((group) => (
              <li
                key={group.id}
                className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
              >
                {group.imageUrl?.startsWith("https://") ? (
                  <img
                    src={group.imageUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xs">
                    WA
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{group.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {copy.groupId}: {group.id}
                  </p>
                  {!group.available ? (
                    <p className="text-xs text-muted-foreground">{copy.unavailable}</p>
                  ) : null}
                </div>
                {group.saved ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const body = await readJson<{ groups: PublicGroup[] }>(
                          await fetch(`/api/whatsapp/groups?groupId=${encodeURIComponent(group.id)}`, {
                            method: "DELETE",
                          })
                        );
                        setGroups((current) =>
                          current.map((item) =>
                            item.id === group.id ? { ...item, saved: false } : item
                          )
                        );
                        setConnection((current) => ({
                          ...current,
                          savedGroupCount: body.groups.filter((item) => item.saved).length,
                        }));
                      })
                    }
                  >
                    {copy.remove}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={busy || !connected}
                    onClick={() =>
                      run(async () => {
                        const body = await readJson<{ groups: PublicGroup[] }>(
                          await fetch("/api/whatsapp/groups", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ groupId: group.id }),
                          })
                        );
                        setGroups(body.groups);
                        setConnection((current) => ({
                          ...current,
                          savedGroupCount: body.groups.filter((item) => item.saved).length,
                        }));
                      })
                    }
                  >
                    {copy.save}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <QrConnectModal
        open={qrOpen}
        title={copy.qrTitle}
        help={copy.qrHelp}
        waiting={copy.qrWaiting}
        expired={expired ? copy.qrExpired : ""}
        closeLabel={copy.close}
        regenerateLabel={copy.regenerate}
        qrCode={qrCode}
        busy={busy}
        onClose={() => setQrOpen(false)}
        onRegenerate={() =>
          run(async () => {
            const body = await readJson<{ qrCode: string | null; connection: PublicConnection }>(
              await fetch("/api/whatsapp/qr", { method: "POST" })
            );
            setConnection(body.connection);
            if (body.qrCode) {
              setQrCode(body.qrCode);
              setQrShownAt(Date.now());
            }
          })
        }
      />
    </section>
  );
}
