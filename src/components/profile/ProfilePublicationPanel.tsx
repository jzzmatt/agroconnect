"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Globe, Lock, Pause, Play } from "lucide-react";
import {
  ensureOwnProviderDraftAction,
  getOwnProviderPublicationAction,
  transitionProviderPublicationAction,
} from "@/lib/agriprofile/actions";
import { publicationStateLabel } from "@/lib/agriprofile/publication";
import type { OwnerProviderPublication } from "@/types/agriprofile";

export function ProfilePublicationPanel() {
  const [publication, setPublication] = useState<OwnerProviderPublication | null>(null);
  const [canPublish, setCanPublish] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getOwnProviderPublicationAction();
      setPublication(result.publication);
      setCanPublish(result.canPublish);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const prepare = async () => {
    setBusy(true);
    setError(null);
    const result = await ensureOwnProviderDraftAction();
    setBusy(false);
    if (!result.success || !result.publication) {
      setError(result.error || "Não foi possível preparar o perfil público.");
      return;
    }
    setPublication(result.publication);
    setCanPublish(result.canPublish);
  };

  const transition = async (action: "publish" | "pause" | "resume") => {
    setBusy(true);
    setError(null);
    const result = await transitionProviderPublicationAction(action);
    setBusy(false);
    if (!result.success || !result.publication) {
      setError(result.error || "Não foi possível atualizar a publicação.");
      return;
    }
    setPublication(result.publication);
  };

  const state = publication?.publication_state || "draft";
  const publicPath = publication?.slug ? `/providers/${publication.slug}` : null;

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <h3 className="text-xs font-black uppercase tracking-wider text-primary">
        6. PERFIL PÚBLICO DO PRESTADOR
      </h3>
      <div className="bg-surface p-5 rounded-2xl border border-border space-y-4">
        {loading ? (
          <p className="text-xs text-muted-foreground">A carregar estado de publicação...</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Estado actual
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base font-black text-foreground">
                    {publicationStateLabel(state)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      state === "published"
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                        : state === "paused"
                          ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {state === "published" ? "Visível" : "Privado"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  O perfil privado existe independentemente da publicação. Nada é tornado público automaticamente.
                </p>
              </div>
            </div>

            {publicPath && state === "published" ? (
              <Link href={publicPath} className="text-xs font-bold text-primary hover:underline">
                Ver página pública: {publicPath}
              </Link>
            ) : publication?.slug ? (
              <p className="text-xs text-muted-foreground">Identificador público: {publication.slug}</p>
            ) : null}

            {error ? <p className="text-xs font-bold text-red-600">{error}</p> : null}

            <div className="flex flex-wrap gap-2">
              {!publication ? (
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={prepare} className="font-bold">
                  Preparar identidade pública
                </Button>
              ) : null}

              {publication && state === "draft" ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={busy || !canPublish}
                  onClick={() => void transition("publish")}
                  className="gap-1.5 font-bold"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Publicar
                </Button>
              ) : null}

              {publication && state === "published" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || !canPublish}
                  onClick={() => void transition("pause")}
                  className="gap-1.5 font-bold"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pausar publicação
                </Button>
              ) : null}

              {publication && state === "paused" ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={busy || !canPublish}
                  onClick={() => void transition("resume")}
                  className="gap-1.5 font-bold"
                >
                  <Play className="w-3.5 h-3.5" />
                  Retomar publicação
                </Button>
              ) : null}
            </div>

            {!canPublish ? (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Pode manter o perfil privado em qualquer plano. Publicar o perfil de prestador requer Profissional, Business ou Empresarial.{" "}
                  <Link href="/planos" className="font-bold text-primary hover:underline">
                    Ver planos
                  </Link>
                </span>
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
