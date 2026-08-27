"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Plus, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getTransportCreatorDashboardAction } from "@/lib/transport/transport-actions";
import { isPubliclyVisibleTransportStatus } from "@/lib/transport/transport-lifecycle";
import type { TransportListItem } from "@/types/transport";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  paused: "Em pausa",
  archived: "Arquivado",
};

function TransportRow({ transport }: { transport: TransportListItem }) {
  return (
    <div className="rounded-3xl border border-border bg-surface-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold">{transport.title}</h3>
          <Badge variant="outline" className="text-[10px]">
            {STATUS_LABELS[transport.status] || transport.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {transport.origin_label || "—"} → {transport.destination_label || "—"} • {transport.vehicle_name}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/transport/${transport.id}/edit`}>
          <Button size="sm" variant="primary">
            Editar
          </Button>
        </Link>
        {isPubliclyVisibleTransportStatus(transport.status) ? (
          <Link href={`/transport/${transport.slug}`} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Ver público
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function TransportSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: TransportListItem[];
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{empty}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">
        {title} ({items.length})
      </h2>
      <div className="space-y-3">
        {items.map((transport) => (
          <TransportRow key={transport.id} transport={transport} />
        ))}
      </div>
    </section>
  );
}

export default function DashboardTransportPage() {
  const searchParams = useSearchParams();
  const [draftTransports, setDraftTransports] = useState<TransportListItem[]>([]);
  const [publishedTransports, setPublishedTransports] = useState<TransportListItem[]>([]);
  const [pausedTransports, setPausedTransports] = useState<TransportListItem[]>([]);
  const [archivedTransports, setArchivedTransports] = useState<TransportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletedNotice, setDeletedNotice] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getTransportCreatorDashboardAction().then((dashboard) => {
      setDraftTransports(dashboard.draftTransports);
      setPublishedTransports(dashboard.publishedTransports);
      setPausedTransports(dashboard.pausedTransports);
      setArchivedTransports(dashboard.archivedTransports);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
    if (searchParams.get("deleted") === "1") {
      setDeletedNotice(true);
    }
  }, [load, searchParams]);

  const hasAny =
    draftTransports.length +
      publishedTransports.length +
      pausedTransports.length +
      archivedTransports.length >
    0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Meus Transportes</h1>
          <p className="text-sm text-muted-foreground">
            Crie rascunhos, publique rotas e gira o estado como nos cursos da AgriAcademy.
          </p>
        </div>
        <Link href="/dashboard/transport/new">
          <Button variant="primary" className="gap-2">
            <Plus className="w-4 h-4" />
            Novo transporte
          </Button>
        </Link>
      </div>

      {deletedNotice ? (
        <p className="text-sm font-semibold text-primary">Transporte eliminado com sucesso.</p>
      ) : null}

      <Link href="/dashboard/transport/requests/receiving" className="text-xs font-bold text-primary">
        Ver pedidos de transporte →
      </Link>

      {loading ? (
        <p className="text-sm text-muted-foreground">A carregar...</p>
      ) : !hasAny ? (
        <div className="rounded-3xl border border-border bg-surface-card p-10 text-center space-y-3">
          <Truck className="w-10 h-10 text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Ainda não tem transportes criados.</p>
          <Link href="/dashboard/transport/new">
            <Button variant="primary" size="sm">
              Criar primeiro transporte
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <TransportSection
            title="Rascunhos"
            items={draftTransports}
            empty="Sem rascunhos. Crie um novo transporte para começar."
          />
          <TransportSection
            title="Publicados"
            items={publishedTransports}
            empty="Nenhum transporte publicado."
          />
          <TransportSection
            title="Em pausa"
            items={pausedTransports}
            empty="Nenhum transporte em pausa."
          />
          <TransportSection
            title="Arquivados"
            items={archivedTransports}
            empty="Nenhum transporte arquivado."
          />
        </div>
      )}
    </div>
  );
}
