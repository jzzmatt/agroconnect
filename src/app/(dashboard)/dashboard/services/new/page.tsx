"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  MapPin,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LocationSelector } from "@/components/location";
import { ANGOLA_PROVINCES } from "@/config/locations";
import { createServiceAction } from "@/lib/services/marketplace-actions";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import { Lock, ArrowRight } from "lucide-react";
import type { PricingType, ServiceLocationType } from "@/types/database";

export default function NewServicePage() {
  const router = useRouter();
  const { entitlements, loading } = useAuthoritativePlan();
  const isBasic = !loading && !entitlements.can_manage_services;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("agricultura-e-solos");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [pricingType, setPricingType] = useState<PricingType>("hourly");
  const [price, setPrice] = useState<number>(25000);
  const [currency] = useState("AOA");
  const [locationType, setLocationType] = useState<ServiceLocationType>("service_area");
  const [selectedProvince, setSelectedProvince] = useState("Huambo");
  const [selectedMunicipality, setSelectedMunicipality] = useState("Caála");
  const [serviceRadiusKm, setServiceRadiusKm] = useState<number>(50);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (isBasic) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-surface-card rounded-3xl p-8 sm:p-12 border border-border text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full">
              Criação Bloqueada • Plano Básico
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              Registar Serviço no AgriExpert
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O seu plano Básico permite pesquisar e solicitar serviços no mercado. Para prestar e publicar serviços, atualize para o plano <strong>Profissional</strong>.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/planos">
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.length < 3) {
      setError("O título do serviço deve conter pelo menos 3 caracteres.");
      return;
    }
    if (price === undefined || price < 0) {
      setError("O valor do serviço deve ser um número positivo.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await createServiceAction({
        title,
        categorySlug: category,
        shortDescription,
        description,
        pricingType,
        price,
        currency,
        locationType,
        provinceName: selectedProvince,
        municipalityName: selectedMunicipality,
        serviceRadiusKm,
        status: "published",
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/services");
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Erro ao publicar serviço. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/services"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar para Os Meus Serviços</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">
          Adicionar Novo Serviço
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Preencha os detalhes do seu serviço para disponibilizá-lo a produtores e empresas em Angola.
        </p>
      </div>

      {success ? (
        <div className="bg-surface-card rounded-3xl p-12 text-center border border-border space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Serviço Publicado com Sucesso!</h3>
          <p className="text-xs text-muted-foreground">A redirecionar para a gestão de serviços...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Basic Info Card */}
          <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
              1. Informações Principais
            </h3>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Título do Serviço <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Instalação e Manutenção de Sistemas de Rega Gota-a-Gota"
                className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Categoria Principal <span className="text-destructive">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="agricultura-e-solos">Agricultura & Solos</option>
                  <option value="veterinaria-e-pecuaria">Medicina Veterinária & Pecuária</option>
                  <option value="maquinas-e-irrigacao">Máquinas & Irrigação</option>
                  <option value="servicos-de-campo">Serviços no Campo & Colheita</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Modalidade do Atendimento
                </label>
                <select
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="service_area">Deslocação à Fazenda / Área de Atuação</option>
                  <option value="physical_location">Local Fixo / Gabinete / Clínica</option>
                  <option value="remote">Remoto / Online (Vídeo Consulta)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Resumo Curto (Aparece nos cartões de pesquisa)
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Ex: Diagnóstico e assistência técnica completa no campo..."
                className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Descrição Completa e Detalhes Técnicos
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Descreva o método de trabalho, equipamentos utilizados, o que está incluído na visita..."
                className="w-full p-3 rounded-2xl bg-surface border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* 2. Pricing Card */}
          <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
              2. Preço e Cobrança
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Estrutura de Preço
                </label>
                <select
                  value={pricingType}
                  onChange={(e) => setPricingType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="fixed">Preço Fixo</option>
                  <option value="hourly">Por Hora</option>
                  <option value="daily">Por Dia</option>
                  <option value="starting_from">A partir de</option>
                  <option value="quotation">Sob Consulta</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Valor (Kwanza - Kz)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  min={0}
                  step={1000}
                  className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Moeda</label>
                <input
                  type="text"
                  value="AOA (Kz)"
                  disabled
                  className="w-full px-4 py-2.5 rounded-2xl bg-surface/50 border border-input-border text-xs font-bold text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* 3. Location & Coverage */}
          <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
              3. Localização Base e Raio de Atendimento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Província Base</label>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {ANGOLA_PROVINCES.map((p) => (
                    <option key={p.code} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Município Base</label>
                <input
                  type="text"
                  value={selectedMunicipality}
                  onChange={(e) => setSelectedMunicipality(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Raio de Atendimento (km)
                </label>
                <input
                  type="number"
                  value={serviceRadiusKm}
                  onChange={(e) => setServiceRadiusKm(Number(e.target.value))}
                  min={1}
                  max={200}
                  className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link href="/dashboard/services">
              <Button variant="outline" size="lg" disabled={isLoading}>
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="gap-2 font-bold px-8 shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>A publicar...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Publicar Serviço</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
