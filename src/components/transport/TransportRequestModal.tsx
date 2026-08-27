"use client";

import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createTransportRequestAction } from "@/lib/transport/transport-actions";
import type { TransportListItem } from "@/types/transport";

export interface TransportRequestModalProps {
  transport: TransportListItem;
  onClose: () => void;
}

export function TransportRequestModal({ transport, onClose }: TransportRequestModalProps) {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [originNotes, setOriginNotes] = useState("");
  const [destinationNotes, setDestinationNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    if (!message.trim()) {
      setFeedback("Descreva o que pretende transportar.");
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    const result = await createTransportRequestAction({
      transportServiceId: transport.id,
      providerId: transport.provider_id,
      message: message.trim(),
      originNotes: originNotes.trim() || undefined,
      destinationNotes: destinationNotes.trim() || undefined,
    });
    setSubmitting(false);
    setFeedback(result.message);
    if (result.success) {
      window.setTimeout(onClose, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface-card rounded-3xl border border-border shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Solicitar transporte</h3>
          <p className="text-xs text-muted-foreground mt-1">{transport.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground">Mensagem</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="Descreva a carga, quantidade e urgência..."
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">Origem (notas)</label>
            <input
              value={originNotes}
              onChange={(e) => setOriginNotes(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              placeholder={transport.origin_label || "Ponto de recolha"}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">Destino (notas)</label>
            <input
              value={destinationNotes}
              onChange={(e) => setDestinationNotes(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              placeholder={transport.destination_label || "Ponto de entrega"}
            />
          </div>

          {feedback ? <p className="text-xs font-semibold text-primary">{feedback}</p> : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? "A enviar..." : "Enviar pedido"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
