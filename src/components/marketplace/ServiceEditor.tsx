"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  CheckCircle2,
  PauseCircle,
  Archive,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ANGOLA_PROVINCES } from "@/config/locations";
import {
  updateServiceAction,
  deleteServiceAction,
} from "@/lib/services/marketplace-actions";
import { useI18n } from "@/i18n/provider";
import { deleteDialogForServiceStatus } from "@/lib/services/service-delete-flow";
import { ServiceDeleteDialog } from "@/components/marketplace/ServiceDeleteDialog";
import type { ServiceListItem } from "@/types/domain";
import type { PricingType, ServiceLocationType, ServiceStatus } from "@/types/database";

function asPricingType(value: string | null | undefined): PricingType {
  switch (value) {
    case "fixed":
    case "hourly":
    case "daily":
    case "starting_from":
    case "quotation":
    case "free":
      return value;
    default:
      return "fixed";
  }
}

function asLocationType(value: string | null | undefined): ServiceLocationType {
  switch (value) {
    case "physical_location":
    case "service_area":
    case "remote":
      return value;
    default:
      return "service_area";
  }
}

export function ServiceEditor({ service }: { service: ServiceListItem }) {
  const router = useRouter();
  const { dict } = useI18n();

  const [current, setCurrent] = useState(service);
  const [title, setTitle] = useState(service.title);
  const [category, setCategory] = useState(service.category_slug || "agricultura-e-solos");
  const [shortDescription, setShortDescription] = useState(service.short_description || "");
  const [description, setDescription] = useState(service.description || "");
  const [pricingType, setPricingType] = useState<PricingType>(asPricingType(service.pricing_type));
  const [price, setPrice] = useState<number>(service.price);
  const [locationType, setLocationType] = useState<ServiceLocationType>(
    asLocationType(service.location_type)
  );
  const [selectedProvince, setSelectedProvince] = useState(service.province_name || "Huambo");
  const [selectedMunicipality, setSelectedMunicipality] = useState(
    service.municipality_name || ""
  );
  const [serviceRadiusKm, setServiceRadiusKm] = useState<number>(service.service_radius_km || 50);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || title.trim().length < 3) {
      setError("O título do serviço deve conter pelo menos 3 caracteres.");
      return;
    }
    if (price < 0) {
      setError("O valor do serviço deve ser um número positivo.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const ok = await updateServiceAction({
        id: current.id,
        title: title.trim(),
        categorySlug: category,
        shortDescription,
        description,
        pricingType,
        price,
        locationType,
        provinceName: selectedProvince,
        municipalityName: selectedMunicipality,
        serviceRadiusKm,
      });
      if (!ok) {
        throw new Error("Não foi possível guardar as alterações.");
      }
      setCurrent({
        ...current,
        title: title.trim(),
        category_slug: category,
        short_description: shortDescription,
        description,
        pricing_type: pricingType,
        price,
        location_type: locationType,
        province_name: selectedProvince,
        municipality_name: selectedMunicipality,
        service_radius_km: serviceRadiusKm,
      });
      setSuccess(dict.agriexpert.serviceSaved);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (nextStatus: ServiceStatus) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const ok = await updateServiceAction({ id: current.id, status: nextStatus });
      if (!ok) throw new Error("Não foi possível atualizar o estado.");
      setCurrent({ ...current, status: nextStatus });
      setSuccess("Estado do serviço atualizado.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar estado.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await deleteServiceAction(current.id);
      if (!result.success) {
        setError(result.error || dict.agriexpert.deleteFailed);
        return;
      }
      router.push("/dashboard/services");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : dict.agriexpert.deleteFailed);
    } finally {
      setSaving(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/services"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar para Os Meus Serviços</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">
          {dict.agriexpert.editServiceTitle}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">{dict.agriexpert.editServiceSubtitle}</p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-300/40 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          {success}
        </div>
      )}

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
              onChange={(e) => setLocationType(e.target.value as ServiceLocationType)}
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
            className="w-full p-3 rounded-2xl bg-surface border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>
      </div>

      <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
          2. Preço e Cobrança
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Estrutura de Preço</label>
            <select
              value={pricingType}
              onChange={(e) => setPricingType(e.target.value as PricingType)}
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
            <label className="text-xs font-bold text-foreground block mb-1">Valor (Kwanza - Kz)</label>
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
              value={`${current.currency || "AOA"} (Kz)`}
              disabled
              className="w-full px-4 py-2.5 rounded-2xl bg-surface/50 border border-input-border text-xs font-bold text-muted-foreground"
            />
          </div>
        </div>
      </div>

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

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <Button variant="primary" disabled={saving} onClick={() => void handleSave()} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          <span>{saving ? dict.agriexpert.savingService : dict.agriexpert.saveService}</span>
        </Button>

        {current.status === "published" || current.status === "active" ? (
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => void handleStatusChange("paused")}
            className="gap-1.5 text-amber-600"
          >
            <PauseCircle className="w-4 h-4" />
            Pausar
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => void handleStatusChange("published")}
            className="gap-1.5 text-emerald-600"
          >
            <CheckCircle2 className="w-4 h-4" />
            Publicar
          </Button>
        )}

        <Button
          variant="outline"
          disabled={saving}
          onClick={() => void handleStatusChange("archived")}
          className="gap-1.5"
        >
          <Archive className="w-4 h-4" />
          Arquivar
        </Button>

        <Link href={`/services/${current.slug}`}>
          <Button variant="outline">Ver página pública</Button>
        </Link>

        <Button
          variant="outline"
          disabled={saving}
          onClick={() => setDeleteOpen(true)}
          className="gap-1.5 text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          {dict.agriexpert.deleteService}
        </Button>
      </div>

      <ServiceDeleteDialog
        open={deleteOpen}
        kind={deleteDialogForServiceStatus(current.status)}
        busy={saving}
        onClose={() => {
          if (saving) return;
          setDeleteOpen(false);
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
