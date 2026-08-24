"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Briefcase,
  ChevronLeft,
  Calendar,
  Sparkles,
  Share2,
} from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { ServiceCard } from "@/components/marketplace/ServiceCard";
import { LocationMap } from "@/components/location";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getProviderBySlugAction, getProviderServicesAction } from "@/lib/services/marketplace-actions";
import { INITIAL_PROVIDERS, INITIAL_SERVICES } from "@/lib/services/marketplace-service";
import type { ProviderPublicProfile, ServiceListItem } from "@/types/domain";

export default function ProviderProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [provider, setProvider] = useState<ProviderPublicProfile | null>(null);
  const [services, setServices] = useState<ServiceListItem[]>([]);

  useEffect(() => {
    if (!slug) return;
    getProviderBySlugAction(slug).then((res) => {
      if (res) {
        setProvider(res);
        getProviderServicesAction(res.id).then((srvs) => {
          setServices(srvs);
        });
      }
    });
  }, [slug]);

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
          <h2 className="text-2xl font-bold">A carregar perfil do prestador...</h2>
        </main>
        <Footer />
      </div>
    );
  }

  const mapMarkers = provider.latitude && provider.longitude ? [{
    id: provider.id,
    title: provider.business_name,
    category: "expert" as const,
    latitude: provider.latitude,
    longitude: provider.longitude,
    provinceName: provider.province_name || "Angola",
    municipalityName: provider.municipality_name || undefined,
    description: provider.headline || undefined,
  }] : [];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        {/* Breadcrumb */}
        <div>
          <Link
            href="/agriexpert?view=servicos"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar aos serviços</span>
          </Link>
        </div>

        {/* Provider Profile Header Card */}
        <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-3xl bg-secondary text-secondary-foreground flex items-center justify-center font-black text-3xl shrink-0 border border-border shadow-xs">
                {provider.business_name.charAt(0)}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                    {provider.business_name}
                  </h1>
                  {provider.verification_status === "verified" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verificado
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-primary">{provider.headline}</p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {provider.municipality_name ? `${provider.municipality_name}, ` : ""}
                      {provider.province_name || "Angola"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-amber-600 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{provider.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground font-normal">
                      ({provider.reviews_count} avaliações)
                    </span>
                  </div>

                  <span>• Cobertura: {provider.service_radius_km} km</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (navigator.clipboard) navigator.clipboard.writeText(window.location.href);
                }}
                className="gap-1.5 text-xs font-bold"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Partilhar</span>
              </Button>
            </div>
          </div>

          {/* Description */}
          {provider.description && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Sobre o Profissional
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed max-w-4xl whitespace-pre-line">
                {provider.description}
              </p>
            </div>
          )}
        </div>

        {/* Provider Services Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Serviços Publicados ({services.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Serviços e consultorias prestados diretamente por {provider.business_name}
              </p>
            </div>
          </div>

          {services.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="bg-surface-card rounded-3xl p-8 text-center border border-border text-muted-foreground text-sm">
              Nenhum serviço publicado no momento por este prestador.
            </div>
          )}
        </div>

        {/* Service Base Location Map */}
        <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-3">
          <h3 className="text-base font-bold text-foreground">Base Operacional e Raio de Cobertura</h3>
          <div className="rounded-2xl overflow-hidden border border-border">
            <LocationMap
              markers={mapMarkers}
              height="h-[320px]"
              center={
                provider.latitude && provider.longitude
                  ? { latitude: provider.latitude, longitude: provider.longitude }
                  : undefined
              }
              zoom={10}
            />
          </div>
        </div>
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
