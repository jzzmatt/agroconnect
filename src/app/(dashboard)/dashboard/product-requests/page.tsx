"use client";

import React, { useState } from "react";
import {
  Inbox,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ProductRequestItem } from "@/types/domain";

export default function ProductRequestsDashboardPage() {
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");

  const [incomingRequests, setIncomingRequests] = useState<ProductRequestItem[]>([
    {
      id: "preq-1",
      customer_id: "cust-1",
      customer_name: "Fazenda Esperança do Huambo",
      customer_phone: "+244 923 777 666",
      customer_email: "esperanca@huambo.ao",
      seller_id: "prov-1",
      product_id: "prd-seed-1",
      product_title: "Semente de Milho Híbrido Certificada ZM-521 (25kg)",
      product_slug: "semente-milho-hibrido-zm521-25kg",
      quantity: 20,
      unit: "saco 25kg",
      status: "pending",
      message: "Gostaríamos de encomendar 20 sacos de semente ZM-521 para início do plantio no início de Outubro.",
      delivery_location_notes: "Caála, Bairro Samacau",
      offered_price: 28500,
      currency: "AOA",
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "preq-2",
      customer_id: "cust-2",
      customer_name: "Associação de Criadores da Ganda",
      customer_phone: "+244 912 444 333",
      customer_email: "criadores.ganda@benguela.ao",
      seller_id: "prov-1",
      product_id: "prd-seed-4",
      product_title: "Kit de Vacinação e Medicamentos Veterinários Bovinos",
      product_slug: "kit-vacinacao-medicamentos-veterinarios",
      quantity: 3,
      unit: "kit",
      status: "accepted",
      message: "Kits para campanha de desparasitação e vacinação de 150 animais.",
      delivery_location_notes: "Ganda, Estrada principal",
      offered_price: 65000,
      currency: "AOA",
      created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  const [outgoingRequests, setOutgoingRequests] = useState<ProductRequestItem[]>([
    {
      id: "preq-out-1",
      customer_id: "my-id",
      seller_id: "prov-2",
      seller_name: "Eng.ª Maria Santos • Solos & Irrigação",
      product_id: "prd-seed-2",
      product_title: "Bomba de Irrigação Solar 3HP com Painéis Fotovoltaicos",
      product_slug: "bomba-irrigacao-solar-3hp-paineis",
      quantity: 1,
      unit: "conjunto",
      status: "pending",
      message: "Pedido de cotação com entrega e montagem técnica incluída.",
      delivery_location_notes: "Lobito, Bairro da Luz",
      currency: "AOA",
      created_at: new Date(Date.now() - 3600000 * 15).toISOString(),
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
          AgriShopping • Vendas & Reservas
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
          Pedidos de Produtos & Cotações
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Acompanhe solicitações de compra, encomendas e cotações de insumos e equipamentos.
        </p>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
          <button
            onClick={() => setActiveTab("incoming")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "incoming"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-surface text-foreground hover:bg-muted"
            }`}
          >
            Pedidos Recebidos ({incomingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("outgoing")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                    {req.product_title}
                  </h3>
                </div>

                <div className="text-xs text-muted-foreground sm:text-right">
                  <div className="flex items-center sm:justify-end gap-1 text-foreground font-black text-sm">
                    <Package className="w-4 h-4 text-primary" />
                    <span>Qtd: {req.quantity} {req.unit}</span>
                  </div>
                  <span className="text-[11px] block mt-0.5">
                    Enviado em {new Date(req.created_at).toLocaleDateString("pt-AO")}
                  </span>
                </div>
              </div>

              {/* Message Box */}
              <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-foreground pb-2 border-b border-border">
                  <span>
                    {activeTab === "incoming" ? `Comprador: ${req.customer_name}` : `Vendedor: ${req.seller_name}`}
                  </span>
                  {req.customer_phone && (
                    <span className="text-primary font-semibold">Tel: {req.customer_phone}</span>
                  )}
                </div>

                <p className="text-xs text-foreground/90 leading-relaxed pt-1">
                  "{req.message}"
                </p>

                {req.delivery_location_notes && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-2">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Entrega pretendida em: {req.delivery_location_notes}</span>
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
                    className="text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
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
                    className="gap-1 text-xs font-bold cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmar Encomenda</span>
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
                ? "Assim que um agricultor solicitar um dos seus produtos, os detalhes aparecerão aqui."
                : "Quando solicitar cotações ou produtos a vendedores, poderá acompanhar o estado nesta secção."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
