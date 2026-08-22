"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  Store,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { OrderSummary } from "@/components/commerce/OrderSummary";
import { ANGOLA_PROVINCES } from "@/config/locations";
import { getCartAction, checkoutOrderAction } from "@/lib/services/commerce-actions";
import type { ShoppingCart } from "@/types/domain";
import type { OrderFulfillmentMethod, PaymentMethod } from "@/types/database";

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<ShoppingCart | null>(null);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<OrderFulfillmentMethod>("delivery");
  const [recipientName, setRecipientName] = useState("Manuel Kwanza");
  const [phone, setPhone] = useState("+244 923 111 222");
  const [province, setProvince] = useState("Huambo");
  const [municipality, setMunicipality] = useState("Caála");
  const [addressLine, setAddressLine] = useState("Fazenda Boa Esperança, Estrada Nacional 260");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mock_sandbox");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCartAction().then((res) => {
      if (res.items.length === 0) {
        router.push("/cart");
      } else {
        setCart(res);
      }
    });
  }, [router]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !phone.trim() || !addressLine.trim()) {
      setError("Por favor, preencha todos os campos obrigatórios de entrega.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await checkoutOrderAction({
        fulfillmentMethod,
        shippingAddressSnapshot: {
          recipient_name: recipientName,
          phone,
          address_line: addressLine,
          province_name: province,
          municipality_name: municipality,
          notes,
        },
        paymentMethod,
        notes,
      });

      if (res.success && res.order) {
        router.push(`/orders/${res.order.order_number}/success`);
      }
    } catch (err: any) {
      setError(err?.message || "Não foi possível concluir o checkout. Inicie sessão para continuar.");
      setIsLoading(false);
    }
  };

  if (!cart) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-sm font-semibold text-muted-foreground">A preparar checkout seguro...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar ao carrinho</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">
            Finalizar Compra
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Escolha o método de entrega e selecione a modalidade de pagamento seguro.
          </p>
        </div>

        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Checkout Steps (Left Column) */}
          <div className="lg:col-span-8 space-y-6">
            {error && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Step 1: Fulfillment Option */}
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                1. Modalidade de Recebimento
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFulfillmentMethod("delivery")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    fulfillmentMethod === "delivery"
                      ? "bg-secondary/70 border-primary text-foreground shadow-xs ring-2 ring-primary/20"
                      : "bg-surface border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Truck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs text-foreground block">Entrega na Fazenda / Local</span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      O vendedor expedirá os produtos para a sua morada indicada.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillmentMethod("pickup")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    fulfillmentMethod === "pickup"
                      ? "bg-secondary/70 border-primary text-foreground shadow-xs ring-2 ring-primary/20"
                      : "bg-surface border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <Store className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-xs text-foreground block">Ponto de Recolha / Loja</span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Recolha direta no armazém ou loja física do vendedor.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2: Shipping / Delivery Address Form */}
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                2. Informações do Destinatário & Localização
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Nome do Destinatário <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Telefone de Contacto <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Província</label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
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
                  <label className="text-xs font-bold text-foreground block mb-1">Município</label>
                  <input
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Endereço / Referência da Fazenda <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Ex: Estrada Nacional 260, km 14, Fazenda Samacau"
                  className="w-full px-4 py-2.5 rounded-2xl bg-surface border border-input-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            {/* Step 3: Payment Method Selection */}
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                3. Pagamento Seguro
              </h3>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs text-amber-900 dark:text-amber-200 block">
                    Ambiente de Simulação / Sandbox Activo
                  </span>
                  <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 block mt-0.5">
                    Os pagamentos reais via Multicaixa / Unitel Money serão ativados após integração da gateway de produção.
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-surface hover:bg-muted transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="mock_sandbox"
                    checked={paymentMethod === "mock_sandbox"}
                    onChange={() => setPaymentMethod("mock_sandbox")}
                    className="text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="font-bold text-xs text-foreground block">
                      Pagamento Simulado de Teste (Confirmação Imediata)
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Valida todo o pipeline de compra, criação de pedido e dedução de stock.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Confirmation Button */}
          <div className="lg:col-span-4 sticky top-20 space-y-4">
            <OrderSummary
              subtotal={cart.subtotal}
              deliveryFee={cart.delivery_fee}
              discount={cart.discount}
              total={cart.total}
              currency={cart.currency}
              isCheckout={true}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="w-full gap-2 font-bold h-12 text-sm shadow-md cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>A processar pedido...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar e Pagar Pedido</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
