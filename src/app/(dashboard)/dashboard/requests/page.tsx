"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Inbox,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getCustomerRequestsAction, getProviderRequestsAction } from "@/lib/services/marketplace-actions";
import type { ServiceRequestItem } from "@/types/domain";

export default function RequestsDashboardPage() {
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");
  const [incomingRequests, setIncomingRequests] = useState<ServiceRequestItem[]>([
    {
      id: "req-demo-1",
      customer_id: "cust-1",
      customer_name: "Fazenda Agro-Kwanza (Sr. Mateus)",
      customer_phone: "+244 923 888 777",
      customer_email: "mateus@agrokwanza.ao",
      provider_id: "prov-1",
      service_id: "srv-1",
      service_title: "Consulta Veterinária em Fazenda e Sanidade Bovina",
      service_slug: "consulta-veterinaria-fazenda-sanidade-bovina",
      status: "pending",
      requested_date: "2026-09-02",
      message: "Necessitamos de uma visita urgente para avaliação ginecológica e protocolo reprodutivo em 45 novilhas de corte.",
      location_notes: "Fazenda Kwanza Sul, km 28 da estrada de Waku Kungo",
      estimated_price: 25000,
      currency: "AOA",
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "req-demo-2",
      customer_id: "cust-2",
      customer_name: "Cooperativa Agrícola do Huambo",
      customer_phone: "+244 912 333 222",
      customer_email: "cooperativa@huambo.ao",
      provider_id: "prov-1",
      service_id: "srv-2",
      service_title: "Inseminação Artificial e Melhoramento Genético Pecuário",
      service_slug: "inseminacao-artificial-melhoramento-genetico",
      status: "accepted",
      requested_date: "2026-09-08",
      message: "Inseminação artificial para lote de 20 vacas leiteiras com sêmen Bonsmara.",
      location_notes: "Caála, Bairro Samacau",
      estimated_price: 45000,
      currency: "AOA",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  const [outgoingRequests, setOutgoingRequests] = useState<ServiceRequestItem[]>([
    {
      id: "req-out-1",
      customer_id: "my-id",
      provider_id: "prov-2",
      provider_name: "Eng.ª Maria Santos • Solos & Irrigação",
      service_id: "srv-seed-2",
      service_title: "Instalação e Manutenção de Sistemas de Irrigação Gota-a-Gota",
      service_slug: "instalacao-sistemas-irrigacao-gota-a-gota",
      status: "pending",
      requested_date: "2026-09-05",
      message: "Orçamento para instalação de rega gota-a-gota em 2 hectares de maracujá.",
      location_notes: "Benguela, Catumbela",
      currency: "AOA",
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

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
      {/* Page Header */}
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

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
          <button
            onClick={() => setActiveTab("incoming")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "incoming"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-surface text-foreground hover:bg-muted"
            }`}
          >
            Pedidos Recebidos ({incomingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("outgoing")}
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

      {/* Requests List */}
      <div className="space-y-4">
        {currentList.length > 0 ? (
          currentList.map((req) => (
            <div
              key={req.id}
              className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(req.status)}
                    <span className="text-xs font-semibold text-muted-foreground">
                      ID: {req.id}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mt-1.5">
                    {req.service_title}
                  </h3>
                </div>

                <div className="text-xs text-muted-foreground sm:text-right">
                  {req.requested_date && (
                    <div className="flex items-center sm:justify-end gap-1 text-foreground font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>Data: {req.requested_date}</span>
                    </div>
                  )}
                  <span className="text-[11px] block mt-0.5">
                    Enviado em {new Date(req.created_at).toLocaleDateString("pt-AO")}
                  </span>
                </div>
              </div>

              {/* Client info & Message box */}
              <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-foreground pb-2 border-b border-border">
                  <span>
                    {activeTab === "incoming" ? `Cliente: ${req.customer_name}` : `Prestador: ${req.provider_name}`}
                  </span>
                  {req.customer_phone && (
                    <span className="text-primary font-semibold">Tel: {req.customer_phone}</span>
                  )}
                </div>

                <p className="text-xs text-foreground/90 leading-relaxed pt-1">
                  "{req.message}"
                </p>

                {req.location_notes && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-2">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Local: {req.location_notes}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {activeTab === "incoming" && req.status === "pending" && (
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIncomingRequests((prev) =>
                        prev.map((r) => (r.id === req.id ? { ...r, status: "rejected" } : r))
                      );
                    }}
                    className="text-xs font-semibold text-destructive hover:bg-destructive/10"
                  >
                    Recusar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setIncomingRequests((prev) =>
                        prev.map((r) => (r.id === req.id ? { ...r, status: "accepted" } : r))
                      );
                    }}
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
