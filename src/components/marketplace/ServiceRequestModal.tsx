"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Send, Calendar, MapPin, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createServiceRequestAction } from "@/lib/services/marketplace-actions";
import {
  clearServiceRequestDraft,
  readServiceRequestDraft,
  serviceRequestOutcome,
  writeServiceRequestDraft,
  type ServiceRequestDraft,
} from "@/lib/whatsapp/service-booking";

interface ServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  serviceTitle: string;
  providerId: string;
  providerName: string;
  priceFormatted: string;
  authLoaded: boolean;
  isSignedIn: boolean;
  signInPath: string;
}

export function ServiceRequestModal({
  isOpen,
  onClose,
  serviceId,
  serviceTitle,
  providerId,
  providerName,
  priceFormatted,
  authLoaded,
  isSignedIn,
  signInPath,
}: ServiceRequestModalProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [locationNotes, setLocationNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const resumed = useRef(false);

  const sendRequest = async (draft: ServiceRequestDraft) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await createServiceRequestAction({
        serviceId,
        providerId,
        message: draft.message,
        requestedDate: draft.requestedDate || undefined,
        locationNotes: draft.locationNotes || undefined,
      });

      if (serviceRequestOutcome(res) === "saved") {
        clearServiceRequestDraft(window.sessionStorage, serviceId);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setMessage("");
          setRequestedDate("");
          setLocationNotes("");
        }, 1800);
      } else {
        setError(res.error || res.message || "Não foi possível enviar o pedido. Tente novamente.");
      }
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : "Não foi possível enviar o pedido. Inicie sessão para continuar.";
      setError(text);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !authLoaded || !isSignedIn || resumed.current) return;
    const draft = readServiceRequestDraft(window.sessionStorage, serviceId);
    if (!draft) return;
    resumed.current = true;
    setMessage(draft.message);
    setRequestedDate(draft.requestedDate);
    setLocationNotes(draft.locationNotes);
    void sendRequest(draft);
    // The saved draft is sent once, after the visitor returns from sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, authLoaded, isSignedIn, serviceId]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      setError("Por favor, descreva o que necessita para este serviço.");
      return;
    }
    if (!authLoaded) return;
    const draft: ServiceRequestDraft = { serviceId, message, requestedDate, locationNotes };
    if (!isSignedIn) {
      writeServiceRequestDraft(window.sessionStorage, draft);
      router.push(signInPath);
      return;
    }
    await sendRequest(draft);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface-elevated w-full max-w-lg rounded-3xl border border-border shadow-2xl p-6 relative flex flex-col space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
            Solicitar Serviço
          </span>
          <h3 className="text-lg font-bold text-foreground mt-0.5">{serviceTitle}</h3>
          <p className="text-xs text-muted-foreground">
            Prestador: <strong className="text-foreground">{providerName}</strong> • {priceFormatted}
          </p>
        </div>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-foreground">Pedido Enviado com Sucesso!</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              O prestador foi notificado e responderá diretamente pelo painel de controlo.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Message requirement */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Descrição do Pedido / Necessidade <span className="text-destructive">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Explique a dimensão do terreno, sintomas da cultura/animais ou requisitos específicos..."
                className="w-full p-3 rounded-2xl bg-surface border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                required
              />
            </div>

            {/* Preferred Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground flex items-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Data Pretendida (Opcional)</span>
                </label>
                <input
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Location Notes */}
              <div>
                <label className="text-xs font-bold text-foreground flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>Localização da Fazenda</span>
                </label>
                <input
                  type="text"
                  value={locationNotes}
                  onChange={(e) => setLocationNotes(e.target.value)}
                  placeholder="Ex: Fazenda Boa Esperança, km 12"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Submit buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isLoading || !authLoaded}
                className="gap-1.5 font-bold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>A enviar...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Pedido</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
