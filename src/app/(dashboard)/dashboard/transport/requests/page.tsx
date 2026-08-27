"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  getCustomerTransportRequestsAction,
  getTransportRequestsForProviderAction,
  updateTransportRequestStatusAction,
} from "@/lib/transport/transport-actions";
import type { TransportRequestItem } from "@/types/transport";

export default function DashboardTransportRequestsPage() {
  const [providerRequests, setProviderRequests] = useState<TransportRequestItem[]>([]);
  const [customerRequests, setCustomerRequests] = useState<TransportRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [provider, customer] = await Promise.all([
      getTransportRequestsForProviderAction(),
      getCustomerTransportRequestsAction(),
    ]);
    setProviderRequests(provider);
    setCustomerRequests(customer);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (requestId: string, status: "accepted" | "rejected" | "cancelled") => {
    await updateTransportRequestStatusAction({ requestId, status });
    load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black">Pedidos de Transporte</h1>
        <p className="text-sm text-muted-foreground">
          Aceite ou rejeite pedidos recebidos. Clientes podem cancelar pedidos pendentes.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">A carregar pedidos...</p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-bold">Recebidos ({providerRequests.length})</h2>
            {providerRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem pedidos recebidos.</p>
            ) : (
              providerRequests.map((req) => (
                <RequestRow
                  key={req.id}
                  request={req}
                  role="provider"
                  onAccept={() => updateStatus(req.id, "accepted")}
                  onReject={() => updateStatus(req.id, "rejected")}
                />
              ))
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold">Enviados ({customerRequests.length})</h2>
            {customerRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem pedidos enviados.</p>
            ) : (
              customerRequests.map((req) => (
                <RequestRow
                  key={req.id}
                  request={req}
                  role="customer"
                  onCancel={
                    req.status === "pending" ? () => updateStatus(req.id, "cancelled") : undefined
                  }
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}

function RequestRow({
  request,
  role,
  onAccept,
  onReject,
  onCancel,
}: {
  request: TransportRequestItem;
  role: "provider" | "customer";
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-card p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-sm">{request.transport_title || "Transporte"}</p>
        <span className="text-xs font-bold uppercase text-primary">{request.status}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {role === "provider" ? request.customer_name : request.provider_name}
      </p>
      {request.message ? <p className="text-sm">{request.message}</p> : null}
      {role === "provider" && request.status === "pending" ? (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={onAccept}>
            Aceitar
          </Button>
          <Button size="sm" variant="outline" onClick={onReject}>
            Rejeitar
          </Button>
        </div>
      ) : null}
      {onCancel ? (
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      ) : null}
    </div>
  );
}
