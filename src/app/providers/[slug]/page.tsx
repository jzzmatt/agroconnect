"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, MapPin, Globe, ChevronLeft, Mail } from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { ServiceCard } from "@/components/marketplace/ServiceCard";
import { Avatar, WhatsAppBrandIcon } from "@/components/ui";
import { LocationBadge } from "@/components/location";
import { ShoppingProductCard } from "@/components/shopping/ShoppingProductCard";
import { ProviderAcademyCoursesSection } from "@/components/academy/ProviderAcademyCoursesSection";
import { ShareLink } from "@/components/sharing/ShareLink";
import { ProviderTransportSection } from "@/components/transport/ProviderTransportSection";
import { getPublishedProviderBySlugAction } from "@/lib/agriprofile/actions";
import { getProviderServicesAction } from "@/lib/services/marketplace-actions";
import { getProviderTransportsAction } from "@/lib/transport/transport-actions";
import { getSellerProductsAction } from "@/lib/services/shopping-actions";
import { listProviderPublishedCoursesAction } from "@/lib/services/course-actions";
import { normalizeWhatsAppNumber } from "@/lib/services/pricing-service";
import { PROFILE_TYPE_CONFIG } from "@/lib/auth/identity-resolvers";
import type { PublicProviderIdentity } from "@/types/agriprofile";
import type { CourseListItem } from "@/types/agriacademy";
import type { ProductListItem, ServiceListItem } from "@/types/domain";
import type { TransportListItem } from "@/types/transport";
import type { ProfileType } from "@/types/database";

export default function ProviderProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [provider, setProvider] = useState<PublicProviderIdentity | null>(null);
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [transports, setTransports] = useState<TransportListItem[]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    getPublishedProviderBySlugAction(slug).then((res) => {
      if (cancelled) return;
      setProvider(res);
      setLoaded(true);
      if (res) {
        getProviderServicesAction(res.id).then((srvs) => {
          if (!cancelled) setServices(srvs);
        });
        getSellerProductsAction(res.id, true).then((items) => {
          if (!cancelled) setProducts(items);
        });
        listProviderPublishedCoursesAction(res.slug, { providerId: res.id }).then((result) => {
          if (!cancelled) setCourses(result.courses);
        });
        getProviderTransportsAction(res.id, true).then((items) => {
          if (!cancelled) setTransports(items);
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, [slug]);

  if (!loaded) {
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

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
          <h2 className="text-2xl font-bold">Perfil público não encontrado</h2>
          <p className="text-sm text-muted-foreground">
            Este prestador não está publicado ou o endereço é inválido.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const wa = normalizeWhatsAppNumber(provider.whatsapp_phone || "");
  const locationLabel = provider.municipality_name
    ? `${provider.municipality_name}, ${provider.province_name || "Angola"}`
    : provider.province_name || "Angola";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        <div>
          <Link
            href="/agriservice?view=servicos"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar aos serviços</span>
          </Link>
        </div>

        <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              <Avatar
                src={provider.avatar_url}
                fallbackText={provider.display_name}
                size="xl"
                className="w-20 h-20 rounded-3xl text-3xl"
              />

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                    {provider.professional_title && provider.professional_title !== "none"
                      ? `${provider.professional_title} ${provider.display_name}`
                      : provider.display_name}
                  </h1>
                  {provider.verification_status === "verified" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verificado
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-primary">
                  {provider.headline || provider.professional_category}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{locationLabel}</span>
                  </div>
                  {provider.website ? (
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-primary"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Website
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <ShareLink
              url={shareUrl}
              title={provider.display_name}
              text="Veja este prestador no AgriConnect:"
            />
          </div>

          {provider.description ? (
            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Sobre o Profissional
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed max-w-4xl whitespace-pre-line">
                {provider.description}
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Contactos e localização
              </h3>
              {provider.province_name ? (
                <LocationBadge
                  provinceName={provider.province_name}
                  municipalityName={provider.municipality_name}
                  size="sm"
                />
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Angola
                </p>
              )}
              {provider.email ? (
                <a
                  href={`mailto:${provider.email}`}
                  className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary"
                >
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{provider.email}</span>
                </a>
              ) : null}
              {wa.isValid ? (
                <a
                  href={wa.waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                  <WhatsAppBrandIcon className="w-4 h-4 fill-current shrink-0" />
                  <span>{wa.formatted}</span>
                </a>
              ) : provider.whatsapp_phone ? (
                <p className="flex items-center gap-2.5 text-sm text-foreground">
                  <WhatsAppBrandIcon className="w-4 h-4 fill-current shrink-0" />
                  <span>{provider.whatsapp_phone}</span>
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Áreas de atuação
              </h3>
              {provider.areas_of_work.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {provider.areas_of_work.map((area) => {
                    const config = PROFILE_TYPE_CONFIG[area.slug as ProfileType];
                    return (
                      <span
                        key={area.slug}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-foreground"
                      >
                        <span>{config?.icon || "•"}</span>
                        <span>{area.label}</span>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {provider.headline || provider.professional_category || "Prestador AgriConnect"}
                </p>
              )}
            </div>
          </div>
        </div>

        <ProviderAcademyCoursesSection courses={courses} providerName={provider.display_name} />

        <ProviderTransportSection transports={transports} providerName={provider.display_name} />

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Serviços Publicados ({services.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Serviços e consultorias prestados diretamente por {provider.display_name}
            </p>
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

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Produtos Publicados ({products.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Produtos agrícolas publicados por {provider.display_name}
            </p>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ShoppingProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-surface-card rounded-3xl p-8 text-center border border-border text-muted-foreground text-sm">
              Nenhum produto publicado no momento por este prestador.
            </div>
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
