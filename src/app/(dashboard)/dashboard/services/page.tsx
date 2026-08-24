"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  SlidersHorizontal,
  MoreVertical,
  CheckCircle2,
  PauseCircle,
  Archive,
  Eye,
  Edit,
  DollarSign,
  MapPin,
  AlertCircle,
  Loader2,
  Sparkles,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { updateServiceAction } from "@/lib/services/marketplace-actions";
import { INITIAL_SERVICES } from "@/lib/services/marketplace-service";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import type { ServiceListItem } from "@/types/domain";

export default function MyServicesDashboardPage() {
  const [services, setServices] = useState<ServiceListItem[]>(INITIAL_SERVICES);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { entitlements, loading } = useAuthoritativePlan();
  const isBasic = !loading && !entitlements.can_manage_services;

  if (isBasic) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-surface-card rounded-3xl p-8 sm:p-12 border border-border text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full">
              Módulo Bloqueado • Plano Básico
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              AgriExpert • Gestão de Serviços
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A prestação e publicação de serviços técnicos agropecuários está disponível a partir do plano <strong>Profissional (15.000 Kz/mês)</strong>.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/pricing">
              <Button variant="primary" size="lg" className="w-full sm:w-auto gap-2 font-bold shadow-md">
                <Sparkles className="w-4 h-4" />
                <span>Ver Planos e Desbloquear</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" size="lg" className="w-full sm:w-auto font-semibold">
                Voltar ao Painel
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredServices = services.filter((s) => {
    const matchesStatus = statusFilter === "all" ? true : s.status === statusFilter;
    const matchesQuery = searchQuery
      ? s.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesStatus && matchesQuery;
  });

  const handleStatusChange = async (serviceId: string, nextStatus: "published" | "paused" | "archived") => {
    setIsUpdating(serviceId);
    try {
      await updateServiceAction({
        id: serviceId,
        status: nextStatus,
      });

      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, status: nextStatus } : s))
      );
    } catch (e) {
      console.warn("Failed to update status:", e);
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Publicado
          </span>
        );
      case "paused":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
            <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
            Pausado
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">
            <Archive className="w-3.5 h-3.5" />
            Arquivado
          </span>
        );
      case "draft":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
            Rascunho
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-card p-6 sm:p-8 rounded-3xl border border-border shadow-xs">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            Gestão de Marketplace
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
            Os Meus Serviços
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Publique, edite preços, defina raios de atendimento e gira os seus serviços no AgriConnect.
          </p>
        </div>

        <Link href="/dashboard/services/new">
          <Button variant="primary" className="gap-2 font-bold shadow-md h-11 px-6">
            <Plus className="w-4 h-4" />
            <span>Adicionar Serviço</span>
          </Button>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-card p-4 rounded-2xl border border-border">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Total de Serviços</span>
          <p className="text-2xl font-black text-foreground mt-1">{services.length}</p>
        </div>
        <div className="bg-surface-card p-4 rounded-2xl border border-border">
          <span className="text-[10px] font-bold text-emerald-600 uppercase">Publicados</span>
          <p className="text-2xl font-black text-foreground mt-1">
            {services.filter((s) => s.status === "published" || s.status === "active").length}
          </p>
        </div>
        <div className="bg-surface-card p-4 rounded-2xl border border-border">
          <span className="text-[10px] font-bold text-amber-600 uppercase">Pausados</span>
          <p className="text-2xl font-black text-foreground mt-1">
            {services.filter((s) => s.status === "paused").length}
          </p>
        </div>
        <div className="bg-surface-card p-4 rounded-2xl border border-border">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Arquivados</span>
          <p className="text-2xl font-black text-foreground mt-1">
            {services.filter((s) => s.status === "archived").length}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-surface-card p-4 rounded-2xl border border-border flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {["all", "published", "paused", "archived"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors capitalize ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {st === "all" ? "Todos" : st === "published" ? "Publicados" : st === "paused" ? "Pausados" : "Arquivados"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar serviços..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Services List Table / Cards */}
      <div className="space-y-3">
        {filteredServices.length > 0 ? (
          filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-surface-card rounded-2xl border border-border p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(service.status)}
                  <Badge variant="pillarExpert" className="text-[10px]">
                    {service.category_name || "Serviço"}
                  </Badge>
                  {service.is_featured && (
                    <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Destaque
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-foreground truncate">{service.title}</h3>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 text-foreground font-black">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    <span>{new Intl.NumberFormat("pt-AO").format(service.price)} {service.currency}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">({service.pricing_type})</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{service.municipality_name ? `${service.municipality_name}, ` : ""}{service.province_name}</span>
                  </div>

                  {service.service_radius_km && (
                    <span>• Cobertura {service.service_radius_km} km</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                <Link href={`/services/${service.slug}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver</span>
                  </Button>
                </Link>

                {service.status === "published" || service.status === "active" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdating === service.id}
                    onClick={() => handleStatusChange(service.id, "paused")}
                    className="gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>Pausar</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdating === service.id}
                    onClick={() => handleStatusChange(service.id, "published")}
                    className="gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Publicar</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdating === service.id}
                  onClick={() => handleStatusChange(service.id, "archived")}
                  className="gap-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Arquivar</span>
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-surface-card rounded-3xl p-12 text-center border border-border space-y-3">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
            <h4 className="text-base font-bold text-foreground">Nenhum serviço encontrado</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Crie o seu primeiro serviço para que clientes em Angola possam descobrir o seu trabalho.
            </p>
            <Link href="/dashboard/services/new">
              <Button variant="primary" size="sm" className="gap-1.5 font-bold mt-2">
                <Plus className="w-4 h-4" />
                <span>Criar Novo Serviço</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
