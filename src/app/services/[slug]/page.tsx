"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Star,
  ShieldCheck,
  Calendar,
  Send,
  Heart,
  Share2,
  ChevronLeft,
  Navigation,
  CheckCircle2,
  Briefcase,
  AlertCircle,
  Clock,
  Sparkles,
  DollarSign,
} from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LocationMap } from "@/components/location";
import { ServiceRequestModal } from "@/components/marketplace/ServiceRequestModal";
import { getServiceBySlugAction, searchServicesAction, toggleFavoriteAction } from "@/lib/services/marketplace-actions";
import { INITIAL_SERVICES } from "@/lib/services/marketplace-service";
import type { ServiceListItem } from "@/types/domain";

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [service, setService] = useState<ServiceListItem | null>(null);
  const [relatedServices, setRelatedServices] = useState<ServiceListItem[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getServiceBySlugAction(slug).then((res) => {
      if (res) {
        setService(res);
        // Load related services
        searchServicesAction({
          categorySlug: res.category_slug || undefined,
          limit: 3,
        }).then((rel) => {
          setRelatedServices(rel.services.filter((s) => s.id !== res.id));
        });
      }
    });
  }, [slug]);

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
          <h2 className="text-2xl font-bold">A carregar serviço...</h2>
          <p className="text-sm text-muted-foreground">Buscando informações do prestador e cobertura geográfica.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const formatPrice = (price: number, type: string, currency = "Kz") => {
    const formatted = new Intl.NumberFormat("pt-AO").format(price);
    switch (type) {
      case "starting_from":
        return `A partir de ${formatted} ${currency}`;
      case "hourly":
        return `${formatted} ${currency} / hora`;
      case "daily":
        return `${formatted} ${currency} / dia`;
      case "quotation":
        return "Preço sob consulta";
      case "free":
        return "Gratuito";
      case "fixed":
      default:
        return `${formatted} ${currency}`;
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const mapMarkers = service.latitude && service.longitude ? [{
    id: service.id,
    title: service.title,
    category: "service" as const,
    latitude: service.latitude,
    longitude: service.longitude,
    provinceName: service.province_name || "Angola",
    municipalityName: service.municipality_name || undefined,
    description: service.short_description || undefined,
  }] : [];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/agriexpert?view=servicos"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar aos serviços</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFavorited(!isFavorited)}
              className="p-2 rounded-xl border border-border bg-surface hover:bg-muted text-foreground transition-colors cursor-pointer"
              aria-label="Guardar nos favoritos"
            >
              <Heart className={`w-4 h-4 ${isFavorited ? "fill-rose-500 text-rose-500" : ""}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-xl border border-border bg-surface hover:bg-muted text-foreground transition-colors cursor-pointer"
              title="Copiar ligação"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {copied && <span className="text-xs text-primary font-bold">Copiado!</span>}
          </div>
        </div>

        {/* Main Service Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Main Details Column */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="pillarExpert">
                  {service.category_name || "Serviço Agropecuário"}
                </Badge>
                {service.is_featured && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                    <Sparkles className="w-3 h-3" />
                    Destaque
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
                {service.title}
              </h1>

              {/* Location and Distance Row */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-1 text-primary font-bold">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {service.municipality_name ? `${service.municipality_name}, ` : ""}
                    {service.province_name || "Angola"}
                  </span>
                </div>
                {service.service_radius_km && (
                  <span>• Raio de cobertura: {service.service_radius_km} km</span>
                )}
                <span>• Moeda: {service.currency}</span>
              </div>

              {/* Service Description */}
              <div className="pt-4 border-t border-border space-y-3">
                <h3 className="text-base font-bold text-foreground">Descrição do Serviço</h3>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {service.description || service.short_description}
                </p>
              </div>

              {/* Key Features / Included */}
              <div className="pt-4 border-t border-border space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  O que está incluído
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Deslocação dentro do raio de serviço</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Relatório técnico / recomendação prática</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Prestador verificado e certificado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Apoio direto via plataforma</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MapQuest Geographic Coverage Map */}
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Área de Atuação e Localização</h3>
                  <p className="text-xs text-muted-foreground">
                    O prestador atende em {service.municipality_name || service.province_name} com raio de até {service.service_radius_km || 50} km.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-border">
                <LocationMap
                  markers={mapMarkers}
                  height="h-[360px]"
                  center={
                    service.latitude && service.longitude
                      ? { latitude: service.latitude, longitude: service.longitude }
                      : undefined
                  }
                  zoom={11}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & Provider Summary & Booking Card */}
          <div className="lg:col-span-4 space-y-6 sticky top-20">
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-md space-y-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Valor do Serviço
                </span>
                <div className="text-2xl font-black text-foreground mt-0.5">
                  {formatPrice(service.price, service.pricing_type, service.currency)}
                </div>
              </div>

              {/* Action Button: Solicitar Serviço */}
              <Button
                variant="primary"
                size="lg"
                onClick={() => setIsRequestModalOpen(true)}
                className="w-full gap-2 font-bold h-12 text-sm shadow-md cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Solicitar este Serviço</span>
              </Button>

              {/* Provider Mini Profile */}
              <div className="pt-5 border-t border-border space-y-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Prestador Responsável
                </span>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center font-black text-lg border border-border">
                    {service.provider_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <h4 className="font-bold text-sm text-foreground truncate">
                        {service.provider_name}
                      </h4>
                      {service.provider_verified && (
                        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </div>
                    {service.provider_rating && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 font-bold mt-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{service.provider_rating.toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          ({service.provider_reviews_count || 0} avaliações)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  href={`/providers/${service.provider_slug}`}
                  className="block text-center text-xs font-bold text-primary hover:underline pt-1"
                >
                  Ver todos os serviços deste prestador →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Service Request Modal */}
      <ServiceRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        serviceId={service.id}
        serviceTitle={service.title}
        providerId={service.provider_id}
        providerName={service.provider_name}
        priceFormatted={formatPrice(service.price, service.pricing_type, service.currency)}
      />

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
