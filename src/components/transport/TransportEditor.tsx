"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TransportVehicleImageUploader } from "@/components/transport/TransportVehicleImageUploader";
import {
  TransportVehicleVideoUploader,
  type PendingTransportVideo,
} from "@/components/transport/TransportVehicleVideoUploader";
import { uploadToImageKit } from "@/lib/products/imagekit-upload";
import {
  archiveTransportAction,
  deleteTransportAction,
  draftTransportAction,
  pauseTransportAction,
  publishTransportAction,
  resumeTransportAction,
  updateTransportAction,
} from "@/lib/transport/transport-actions";
import { deleteDialogForTransportStatus } from "@/lib/transport/transport-delete-flow";
import { isPubliclyVisibleTransportStatus } from "@/lib/transport/transport-lifecycle";
import type { TransportListItem } from "@/types/transport";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  paused: "Em pausa",
  archived: "Arquivado",
};

export function TransportEditor({ transport }: { transport: TransportListItem }) {
  const router = useRouter();
  const [current, setCurrent] = useState(transport);
  const [title, setTitle] = useState(transport.title);
  const [originLabel, setOriginLabel] = useState(transport.origin_label || "");
  const [destinationLabel, setDestinationLabel] = useState(transport.destination_label || "");
  const [vehicleName, setVehicleName] = useState(transport.vehicle_name);
  const [vehicleModel, setVehicleModel] = useState(transport.vehicle_model || "");
  const [capacityLoad, setCapacityLoad] = useState(transport.capacity_load || "");
  const [pricePerTrip, setPricePerTrip] = useState(String(transport.price_per_trip || ""));
  const [pricePerLoad, setPricePerLoad] = useState(String(transport.price_per_load || ""));
  const [description, setDescription] = useState(transport.description || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(transport.vehicle_media_url || null);
  const [pendingVideo, setPendingVideo] = useState<PendingTransportVideo | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const saveFields = async (): Promise<TransportListItem | null> => {
    const result = await updateTransportAction({
      id: current.id,
      title,
      originLabel,
      destinationLabel,
      vehicleName,
      vehicleModel,
      capacityLoad,
      description,
      pricePerTrip: Number(pricePerTrip) || 0,
      pricePerLoad: Number(pricePerLoad) || 0,
    });
    if (!result.success) {
      setFeedback(result.error);
      return null;
    }
    setCurrent(result.data);
    return result.data;
  };

  const uploadMedia = async (transportId: string) => {
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
      setImagePreview(imagePayload.url);
      setImageFile(null);
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
      setPendingVideo(null);
    }
  };

  const handleSaveDraft = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const saved = await saveFields();
      if (!saved) return;
      await uploadMedia(saved.id);
      setFeedback("Rascunho guardado com sucesso.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao guardar.");
    } finally {
      setBusy(false);
    }
  };

  const runLifecycle = async (
    action: () => Promise<{ success: boolean; error?: string; data?: TransportListItem }>
  ) => {
    setBusy(true);
    setFeedback(null);
    try {
      const saved = await saveFields();
      if (!saved) return;
      await uploadMedia(saved.id);
      const result = await action();
      if (!result.success || !result.data) {
        setFeedback(result.error || "Não foi possível atualizar o estado.");
        return;
      }
      setCurrent(result.data);
      setFeedback(`Estado atualizado: ${STATUS_LABELS[result.data.status]}.`);
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha na operação.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setFeedback(null);
    const result = await deleteTransportAction(current.id);
    setBusy(false);
    if (!result.success) {
      setFeedback(result.error);
      setDeleteOpen(false);
      return;
    }
    router.push("/dashboard/transport?deleted=1");
  };

  const deleteKind = deleteDialogForTransportStatus(current.status);

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/transport"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar aos transportes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{STATUS_LABELS[current.status] || current.status}</Badge>
          </div>
          <h1 className="text-2xl font-black">Editar transporte</h1>
          <p className="text-sm text-muted-foreground">
            Guarde como rascunho, publique quando estiver pronto, ou pause a publicação.
          </p>
        </div>
        {isPubliclyVisibleTransportStatus(current.status) ? (
          <Link href={`/transport/${current.slug}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold">
              <ExternalLink className="w-3.5 h-3.5" />
              Ver página pública
            </Button>
          </Link>
        ) : (
          <p className="text-xs text-muted-foreground max-w-xs">
            A página pública só fica disponível após publicar este transporte.
          </p>
        )}
      </div>

      <div className="space-y-4 rounded-3xl border border-border bg-surface-card p-6">
        <Field label="Título" value={title} onChange={setTitle} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Origem" value={originLabel} onChange={setOriginLabel} placeholder="Luanda" />
          <Field label="Destino" value={destinationLabel} onChange={setDestinationLabel} placeholder="Benguela" />
        </div>
        <Field label="Veículo" value={vehicleName} onChange={setVehicleName} required />
        <Field label="Modelo" value={vehicleModel} onChange={setVehicleModel} />
        <Field label="Capacidade / carga" value={capacityLoad} onChange={setCapacityLoad} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Preço por viagem (Kz)" value={pricePerTrip} onChange={setPricePerTrip} type="number" />
          <Field label="Preço por carga (Kz)" value={pricePerLoad} onChange={setPricePerLoad} type="number" />
        </div>

        <TransportVehicleImageUploader
          previewUrl={imagePreview}
          disabled={busy}
          onSelect={(file, preview) => {
            setImageFile(file);
            setImagePreview(preview);
          }}
        />

        <TransportVehicleVideoUploader
          video={pendingVideo}
          onChange={setPendingVideo}
          disabled={busy}
        />
        {current.vehicle_video_url && !pendingVideo ? (
          <video
            src={current.vehicle_video_url}
            controls
            playsInline
            className="w-full max-h-48 rounded-2xl border border-border bg-black"
          />
        ) : null}

        <div>
          <label className="text-xs font-bold text-muted-foreground">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        {feedback ? (
          <p className={`text-sm font-semibold ${feedback.includes("sucesso") || feedback.includes("Estado") ? "text-primary" : "text-destructive"}`}>
            {feedback}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <Button type="button" onClick={handleSaveDraft} disabled={busy}>
            {busy ? "A guardar..." : "Guardar rascunho"}
          </Button>
          {current.status === "draft" || current.status === "paused" ? (
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => runLifecycle(() => publishTransportAction(current.id))}
            >
              Publicar
            </Button>
          ) : null}
          {current.status === "published" ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => runLifecycle(() => pauseTransportAction(current.id))}
            >
              Pausar publicação
            </Button>
          ) : null}
          {current.status === "paused" ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => runLifecycle(() => resumeTransportAction(current.id))}
              >
                Retomar publicação
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => runLifecycle(() => draftTransportAction(current.id))}
              >
                Voltar a rascunho
              </Button>
            </>
          ) : null}
          {current.status !== "archived" ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => runLifecycle(() => archiveTransportAction(current.id))}
            >
              Arquivar
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="gap-1.5 text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </Button>
        </div>
      </div>

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface-card rounded-3xl border border-border p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold">
              {deleteKind === "published_block" ? "Pause antes de eliminar" : "Eliminar transporte?"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {deleteKind === "published_block"
                ? "Este transporte está publicado. Pause a publicação antes de o eliminar."
                : "Esta ação é permanente e não pode ser desfeita."}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
                Cancelar
              </Button>
              {deleteKind === "confirm_delete" ? (
                <Button variant="primary" size="sm" disabled={busy} onClick={handleDelete}>
                  Confirmar eliminação
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
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
