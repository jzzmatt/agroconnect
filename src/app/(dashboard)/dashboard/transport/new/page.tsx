"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createTransportAction } from "@/lib/transport/transport-actions";

export default function NewTransportPage() {
  const [title, setTitle] = useState("");
  const [originLabel, setOriginLabel] = useState("");
  const [destinationLabel, setDestinationLabel] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [capacityLoad, setCapacityLoad] = useState("");
  const [pricePerTrip, setPricePerTrip] = useState("");
  const [pricePerLoad, setPricePerLoad] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    const result = await createTransportAction({
      title,
      originLabel,
      destinationLabel,
      vehicleName,
      vehicleModel,
      capacityLoad,
      description,
      pricePerTrip: Number(pricePerTrip) || 0,
      pricePerLoad: Number(pricePerLoad) || 0,
      status: "draft",
    });
    setSubmitting(false);
    if (result.success) {
      setFeedback("Transporte criado com sucesso.");
    } else {
      setFeedback(result.error || "Falha ao criar transporte.");
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/transport"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-black">Novo Transporte</h1>
        <p className="text-sm text-muted-foreground">
          Defina rota, veículo e preços por viagem e por carga.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border bg-surface-card p-6">
        <Field label="Título" value={title} onChange={setTitle} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Origem" value={originLabel} onChange={setOriginLabel} placeholder="Luanda" />
          <Field
            label="Destino"
            value={destinationLabel}
            onChange={setDestinationLabel}
            placeholder="Benguela"
          />
        </div>
        <Field label="Veículo" value={vehicleName} onChange={setVehicleName} required placeholder="Kia Canter" />
        <Field label="Modelo" value={vehicleModel} onChange={setVehicleModel} />
        <Field label="Capacidade / carga" value={capacityLoad} onChange={setCapacityLoad} placeholder="5 toneladas" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Preço por viagem (Kz)"
            value={pricePerTrip}
            onChange={setPricePerTrip}
            type="number"
          />
          <Field
            label="Preço por carga (Kz)"
            value={pricePerLoad}
            onChange={setPricePerLoad}
            type="number"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        {feedback ? <p className="text-sm font-semibold text-primary">{feedback}</p> : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "A guardar..." : "Criar transporte"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}
