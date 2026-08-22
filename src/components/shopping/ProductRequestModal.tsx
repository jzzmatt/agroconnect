"use client";

import React, { useState } from "react";
import { X, Send, MapPin, AlertCircle, CheckCircle2, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createProductRequestAction } from "@/lib/services/shopping-actions";

interface ProductRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  sellerId: string;
  sellerName: string;
  priceFormatted: string;
  unit: string;
  maxAvailable?: number;
}

export function ProductRequestModal({
  isOpen,
  onClose,
  productId,
  productTitle,
  sellerId,
  sellerName,
  priceFormatted,
  unit,
  maxAvailable = 50,
}: ProductRequestModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [message, setMessage] = useState("");
  const [deliveryLocationNotes, setDeliveryLocationNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError("A quantidade deve ser superior a zero.");
      return;
    }
    if (!message.trim()) {
      setError("Por favor, descreva os detalhes do seu pedido ou endereço de entrega pretendido.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await createProductRequestAction({
        productId,
        sellerId,
        quantity,
        unit,
        message,
        deliveryLocationNotes: deliveryLocationNotes || undefined,
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setMessage("");
          setQuantity(1);
          setDeliveryLocationNotes("");
        }, 1800);
      }
    } catch (err: any) {
      setError(err?.message || "Não foi possível enviar a solicitação. Inicie sessão para continuar.");
    } finally {
      setIsLoading(false);
    }
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
            AgriShopping • Solicitar Produto
          </span>
          <h3 className="text-lg font-bold text-foreground mt-0.5">{productTitle}</h3>
          <p className="text-xs text-muted-foreground">
            Vendedor: <strong className="text-foreground">{sellerName}</strong> • {priceFormatted}/{unit}
          </p>
        </div>

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-foreground">Pedido Enviado com Sucesso!</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              O vendedor foi notificado com o seu pedido de cotação / reserva e entrará em contacto.
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

            {/* Quantity selection */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Quantidade Pretendida ({unit}) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={maxAvailable || 9999}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            {/* Message requirement */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Mensagem / Requisitos de Entrega <span className="text-destructive">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Indique a urgência da entrega, tipo de transporte ou dúvidas sobre o produto..."
                className="w-full p-3 rounded-2xl bg-surface border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                required
              />
            </div>

            {/* Delivery Location Notes */}
            <div>
              <label className="text-xs font-bold text-foreground flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>Local de Entrega Pretendido (Fazenda / Armazém)</span>
              </label>
              <input
                type="text"
                value={deliveryLocationNotes}
                onChange={(e) => setDeliveryLocationNotes(e.target.value)}
                placeholder="Ex: Fazenda Bela Vista, Huambo / Caála"
                className="w-full px-3 py-2 rounded-xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
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
                disabled={isLoading}
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
                    <span>Enviar Solicitação</span>
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
