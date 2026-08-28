"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Inbox,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getCustomerRequestsAction,
  getProviderRequestsAction,
  updateServiceRequestStatusAction,
} from "@/lib/services/marketplace-actions";
import type { ServiceRequestItem } from "@/types/domain";

const LIVE_REFRESH_MS = 4000;

export default function RequestsDashboardPage() {
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");
  const [incomingRequests, setIncomingRequests] = useState<ServiceRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ServiceRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadSeq = useRef(0);

  const loadRequests = useCallback(async (silent = false) => {
    const seq = ++loadSeq.current;
    if (!silent) setIsLoading(true);
    try {
      const [incoming, outgoing] = await Promise.all([
        getProviderRequestsAction(),
        getCustomerRequestsAction(),
      ]);
      if (seq !== loadSeq.current) return;
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch {
      if (seq !== loadSeq.current) return;
      if (!silent) {
        setIncomingRequests([]);
        setOutgoingRequests([]);
      }
    } finally {
      if (seq === loadSeq.current && !silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests(false);
    const interval = window.setInterval(() => {
      void loadRequests(true);
    }, LIVE_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadRequests(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadRequests]);

  const handleStatusChange = async (requestId: string, status: "accepted" | "rejected") => {
    setUpdatingId(requestId);
    setError(null);
    try {
      const result = await updateServiceRequestStatusAction({ id: requestId, status });
      if (!result.success) {
        setError(result.error || "Não foi possível atualizar o pedido.");
        return;
      }
      setIncomingRequests((prev) =>
        prev.map((row) => (row.id === requestId ? { ...row, status } : row))
      );
      setOutgoingRequests((prev) =>
        prev.map((row) => (row.id === requestId ? { ...row, status } : row))
      );
      void loadRequests(true);
    } catch {
      setError("Não foi possível atualizar o pedido.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Aceite
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Recusado
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pendente
          </span>
        );
    }
  };

  const currentList = activeTab === "incoming" ? incomingRequests : outgoingRequests;

  return (
    <div className="space-y-6">
      <div className="bg-surface-card p-6 sm:p-8 rounded-3xl border border-border shadow-xs">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">
          Comunicação & Atendimento
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
          Pedidos de Serviço
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Acompanhe solicitações de clientes ou visualize pedidos que efetuou a outros especialistas.
        </p>

        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => {
              setActiveTab("incoming");
              void loadRequests(true);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "incoming"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-surface text-foreground hover:bg-muted"
            }`}
          >
            Pedidos Recebidos ({incomingRequests.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("outgoing");
              void loadRequests(true);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "outgoing"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-surface text-foreground hover:bg-muted"
            }`}
          >
            Os Meus Pedidos Enviados ({outgoingRequests.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-surface-card rounded-3xl p-12 text-center border border-border">
            <p className="text-sm text-muted-foreground">A carregar pedidos...</p>
          </div>
        ) : currentList.length > 0 ? (
          currentList.map((req) => (
            <div
              key={req.id}
              className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(req.status)}
                  </div>
                  <h3 className="text-base font-bold text-foreground mt-1.5">
                    {req.service_title}
                  </h3>
                </div>

                <div className="text-xs text-muted-foreground sm:text-right">
                  {req.requested_date && (
                    <div className="flex items-center sm:justify-end gap-1 text-foreground font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>Data: {new Date(req.requested_date).toLocaleDateString("pt-AO")}</span>
                    </div>
                  )}
                  <span className="text-[11px] block mt-0.5">
                    Enviado em {new Date(req.created_at).toLocaleDateString("pt-AO")}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-foreground pb-2 border-b border-border">
                  <span>
                    {activeTab === "incoming"
                      ? `Cliente: ${req.customer_name || "Cliente"}`
                      : `Prestador: ${req.provider_name || "Prestador"}`}
                  </span>
                  {req.customer_phone && (
                    <span className="text-primary font-semibold">Tel: {req.customer_phone}</span>
                  )}
                </div>

                <p className="text-xs text-foreground/90 leading-relaxed pt-1">
                  &quot;{req.message}&quot;
                </p>

                {req.location_notes && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-2">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Local: {req.location_notes}</span>
                  </div>
                )}
              </div>

              {activeTab === "incoming" && req.status === "pending" && (
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updatingId === req.id}
                    onClick={() => handleStatusChange(req.id, "rejected")}
                    className="text-xs font-semibold text-destructive hover:bg-destructive/10"
                  >
                    Recusar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={updatingId === req.id}
                    onClick={() => handleStatusChange(req.id, "accepted")}
                    className="gap-1 text-xs font-bold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Aceitar Pedido</span>
                  </Button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-surface-card rounded-3xl p-12 text-center border border-border space-y-3">
            <Inbox className="w-8 h-8 text-muted-foreground mx-auto" />
            <h4 className="text-base font-bold text-foreground">Nenhum pedido registado</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {activeTab === "incoming"
                ? "Assim que um cliente solicitar um dos seus serviços, os detalhes aparecerão aqui."
                : "Quando solicitar serviços a especialistas, poderá acompanhar o estado nesta secção."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
