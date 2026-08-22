"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Lock, Sparkles, Building2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import { requestCustomPaymentGatewayAction } from "@/lib/services/enterprise-service-actions";

export default function EnterpriseServicesPage() {
  const { entitlements, plan } = useAuthoritativePlan();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const available = entitlements.can_request_custom_payment_gateway;

  const handleRequest = async () => {
    setLoading(true);
    const result = await requestCustomPaymentGatewayAction(
      "Pedido de configuração personalizada de gateway de pagamento."
    );
    setMessage(result.success ? "Pedido enviado à equipa AgriConnect." : result.error || "Pedido recusado.");
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-8 space-y-3">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">Serviços empresariais</span>
        <h1 className="text-2xl font-black">Configuração personalizada de gateway de pagamento</h1>
        <p className="text-xs text-muted-foreground">
          Este é um serviço comercial da AgriConnect, não uma funcionalidade automática da subscrição Empresarial.
          A equipa técnica trata da configuração após o pedido.
        </p>
      </div>

      <div className="bg-surface-card rounded-3xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-sm font-bold">Gateway de pagamento à medida</h2>
            <p className="text-xs text-muted-foreground">Disponível apenas para clientes Empresarial.</p>
          </div>
        </div>

        {available ? (
          <Button onClick={handleRequest} disabled={loading} className="font-bold text-xs">
            Solicitar configuração
          </Button>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
            <p className="text-xs font-bold flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              Disponível no plano Empresarial
            </p>
            <p className="text-xs text-muted-foreground">
              Plano atual: {plan}. Atualize para Empresarial (80.000 Kz/mês) para solicitar este serviço.
            </p>
            <Link href="/pricing">
              <Button variant="primary" size="sm" className="font-bold text-xs">
                <Sparkles className="w-4 h-4 mr-1.5" />
                Atualizar plano
              </Button>
            </Link>
          </div>
        )}

        {message && (
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
