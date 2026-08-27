"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TransportCard } from "@/components/transport";
import {
  getOwnedTransportsAction,
  updateTransportStatusAction,
} from "@/lib/transport/transport-actions";
import type { TransportListItem } from "@/types/transport";

export default function DashboardTransportPage() {
  const [transports, setTransports] = useState<TransportListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getOwnedTransportsAction().then((items) => {
      setTransports(items);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const handlePublish = async (id: string, status: "published" | "paused" | "draft") => {
    await updateTransportStatusAction(id, status);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Meus Transportes</h1>
          <p className="text-sm text-muted-foreground">
            Publique rotas e veículos para clientes solicitarem transporte.
          </p>
        </div>
        <Link href="/dashboard/transport/new">
          <Button variant="primary" className="gap-2">
            <Plus className="w-4 h-4" />
            Novo transporte
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/dashboard/transport/requests" className="text-xs font-bold text-primary">
          Ver pedidos de transporte →
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">A carregar...</p>
      ) : transports.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface-card p-10 text-center space-y-3">
          <Truck className="w-10 h-10 text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Ainda não tem transportes publicados.</p>
          <Link href="/dashboard/transport/new">
            <Button variant="primary" size="sm">
              Criar primeiro transporte
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {transports.map((transport) => (
            <div
              key={transport.id}
              className="rounded-3xl border border-border bg-surface-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <h3 className="font-bold">{transport.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {transport.origin_label} → {transport.destination_label} • {transport.vehicle_name}
                </p>
                <p className="text-xs font-semibold text-primary mt-1">Estado: {transport.status}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {transport.status !== "published" ? (
                  <Button size="sm" onClick={() => handlePublish(transport.id, "published")}>
                    Publicar
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handlePublish(transport.id, "paused")}>
                    Pausar
                  </Button>
                )}
                <Link href={`/transport/${transport.slug}`}>
                  <Button size="sm" variant="outline">
                    Ver público
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
