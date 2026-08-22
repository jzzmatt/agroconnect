"use client";

import React, { useState } from "react";
import { KeyRound, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  sellerId: string;
  courierId: string;
  onVerifySuccess: () => void;
}

export function OTPVerificationModal({
  isOpen,
  onClose,
  orderNumber,
  sellerId,
  courierId,
  onVerifySuccess,
}: OTPVerificationModalProps) {
  const [otpInput, setOtpInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim() || otpInput.trim().length !== 6) {
      setError("Introduza o código numérico de 6 dígitos fornecido pelo destinatário.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { updateCourierDeliveryStatusAction } = await import("@/lib/services/logistics-actions");
      const res = await updateCourierDeliveryStatusAction({
        orderNumber,
        sellerId,
        courierId,
        nextDeliveryStatus: "delivered",
        otpCode: otpInput.trim(),
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onVerifySuccess();
          onClose();
          setSuccess(false);
          setOtpInput("");
        }, 1500);
      }
    } catch (err: any) {
      setError(err?.message || "Código OTP incorreto. Peça ao cliente para verificar o código.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-surface-elevated w-full max-w-md rounded-3xl border border-border shadow-2xl p-6 sm:p-7 relative flex flex-col space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <KeyRound className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary block">
            Confirmação de Entrega em Mãos
          </span>
          <h3 className="text-lg font-black text-foreground">
            Validar Código OTP do Destinatário
          </h3>
          <p className="text-xs text-muted-foreground">
            Pedido #{orderNumber} • Solicite o código de 6 dígitos que o cliente recebeu na sua conta.
          </p>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-sm text-foreground">Entrega Validada com Sucesso!</h4>
            <p className="text-xs text-muted-foreground">O pedido foi marcado como concluído.</p>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-foreground block mb-1 text-center">
                Código de 6 Dígitos
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ""))}
                placeholder="Ex: 483921"
                className="w-full text-center text-2xl font-mono font-black tracking-widest px-4 py-3 rounded-2xl bg-surface border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isLoading}
                className="w-1/3 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isLoading}
                className="w-2/3 font-bold text-xs h-10"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>A validar...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    <span>Confirmar Entrega</span>
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
