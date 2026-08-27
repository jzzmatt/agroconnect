"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, MapPin, Truck } from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { LocationBadge } from "@/components/location";
import { ShareLink } from "@/components/sharing/ShareLink";
import { TransportRequestModal } from "@/components/transport";
import { getTransportBySlugAction } from "@/lib/transport/transport-actions";
import type { TransportListItem } from "@/types/transport";

function formatPrice(amount: number, currency = "AOA") {
  return `${amount.toLocaleString("pt-AO")} ${currency === "AOA" ? "Kz" : currency}`;
}

export default function TransportDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [transport, setTransport] = useState<TransportListItem | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (!slug) return;
    getTransportBySlugAction(slug).then((item) => {
      setTransport(item);
      setLoaded(true);
    });
  }, [slug]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, [slug]);

  if (!loaded) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-20 text-center text-sm text-muted-foreground">
          A carregar transporte...
        </main>
        <Footer />
      </div>
    );
  }

  if (!transport) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-20 text-center space-y-3">
          <h1 className="text-2xl font-bold">Transporte não encontrado</h1>
          <Link href="/agriservice?view=transporte" className="text-primary text-sm font-bold">
            Voltar à descoberta
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full space-y-6">
        <Link
          href="/agriservice?view=transporte"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar ao transporte
        </Link>

        <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Truck className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Transporte</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black">{transport.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                por{" "}
                <Link href={`/providers/${transport.provider_slug}`} className="text-primary font-bold">
                  {transport.provider_name}
                </Link>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-surface border border-border p-4">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Origem</span>
              <p className="font-bold mt-1">{transport.origin_label || transport.origin_province_name || "—"}</p>
            </div>
            <div className="rounded-2xl bg-surface border border-border p-4">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Destino</span>
              <p className="font-bold mt-1">
                {transport.destination_label || transport.destination_province_name || "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-surface border border-border p-4">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Preço por viagem</span>
              <p className="text-xl font-black mt-1">{formatPrice(transport.price_per_trip, transport.currency)}</p>
            </div>
            <div className="rounded-2xl bg-surface border border-border p-4">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Preço por carga</span>
              <p className="text-xl font-black mt-1">{formatPrice(transport.price_per_load, transport.currency)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-bold">Veículo</h2>
            <p className="text-sm">
              {transport.vehicle_name}
              {transport.vehicle_model ? ` • ${transport.vehicle_model}` : ""}
              {transport.capacity_load ? ` • ${transport.capacity_load}` : ""}
            </p>
          </div>

          {transport.base_province_name ? (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <LocationBadge
                provinceName={transport.base_province_name}
                municipalityName={transport.base_municipality_name || undefined}
                size="sm"
              />
              <span className="text-xs text-muted-foreground">(localização base)</span>
            </div>
          ) : null}

          {transport.description ? (
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
              {transport.description}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button variant="primary" onClick={() => setShowRequest(true)}>
              Solicitar transporte
            </Button>
            {shareUrl ? (
              <ShareLink url={shareUrl} title={transport.title} text="Veja este transporte no AgriConnect:" />
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
      <MobileBottomNav variant="marketing" />
      {showRequest ? (
        <TransportRequestModal transport={transport} onClose={() => setShowRequest(false)} />
      ) : null}
    </div>
  );
}
