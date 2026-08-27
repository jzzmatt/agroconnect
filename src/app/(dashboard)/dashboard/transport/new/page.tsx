"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createTransportAction } from "@/lib/transport/transport-actions";
import { TransportVehicleImageUploader } from "@/components/transport/TransportVehicleImageUploader";
import {
  TransportVehicleVideoUploader,
  type PendingTransportVideo,
} from "@/components/transport/TransportVehicleVideoUploader";
import { uploadToImageKit } from "@/lib/products/imagekit-upload";

export default function NewTransportPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [originLabel, setOriginLabel] = useState("");
  const [destinationLabel, setDestinationLabel] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [capacityLoad, setCapacityLoad] = useState("");
  const [pricePerTrip, setPricePerTrip] = useState("");
  const [pricePerLoad, setPricePerLoad] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingVideo, setPendingVideo] = useState<PendingTransportVideo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
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

      if (!result.success || !result.transport?.id) {
        setFeedback(result.error || "Falha ao criar transporte.");
        return;
      }

      const transportId = result.transport.id;

      if (imageFile) {
        const form = new FormData();
        form.append("transportId", transportId);
        form.append("file", imageFile, imageFile.name);
        const imageRes = await fetch("/api/transport/image", {
          method: "POST",
          body: form,
          credentials: "same-origin",
        });
        const imagePayload = await imageRes.json().catch(() => null);
        if (!imageRes.ok || !imagePayload?.success) {
          throw new Error(imagePayload?.message || "Falha ao carregar a imagem do veículo.");
        }
      }

      if (pendingVideo) {
        const videoRes = await fetch("/api/transport/video/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            transportId,
            filename: pendingVideo.file.name,
            mimeType: pendingVideo.file.type,
            fileSize: pendingVideo.file.size,
            durationSeconds: pendingVideo.duration,
          }),
        });
        const videoPayload = await videoRes.json().catch(() => null);
        if (!videoRes.ok || !videoPayload?.success) {
          throw new Error(videoPayload?.message || "Falha ao preparar o envio do vídeo.");
        }

        const upload = videoPayload.upload;
        if (!upload?.uploadUrl || !upload?.publicKey || !upload?.signature || !upload?.token || !upload?.expire) {
          throw new Error(upload?.error || "ImageKit não está configurado.");
        }

        const uploaded = await uploadToImageKit({
          file: pendingVideo.file,
          uploadUrl: upload.uploadUrl,
          publicKey: upload.publicKey,
          signature: upload.signature,
          token: upload.token,
          expire: upload.expire,
          folder: upload.folder,
        });

        const confirmRes = await fetch("/api/transport/video/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            transportId,
            fileId: uploaded.fileId,
            url: uploaded.url,
            thumbnailUrl: uploaded.thumbnailUrl,
          }),
        });
        const confirmPayload = await confirmRes.json().catch(() => null);
        if (!confirmRes.ok || !confirmPayload?.success) {
          throw new Error(confirmPayload?.message || "Falha ao confirmar o vídeo do veículo.");
        }
      }

      router.push("/dashboard/transport");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao criar transporte.";
      setFeedback(message);
    } finally {
      setSubmitting(false);
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
          Defina rota, veículo, preços e média opcional (imagem e vídeo curto).
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

        <TransportVehicleImageUploader
          previewUrl={imagePreview}
          disabled={submitting}
          onSelect={(file, preview) => {
            setImageFile(file);
            setImagePreview(preview);
          }}
        />

        <TransportVehicleVideoUploader
          video={pendingVideo}
          onChange={setPendingVideo}
          disabled={submitting}
        />

        <div>
          <label className="text-xs font-bold text-muted-foreground">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        {feedback ? <p className="text-sm font-semibold text-destructive">{feedback}</p> : null}
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
