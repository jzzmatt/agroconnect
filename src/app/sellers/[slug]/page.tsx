"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Star,
  MapPin,
  Store,
  Package,
  ChevronLeft,
  Share2,
} from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { ShoppingProductCard } from "@/components/shopping/ShoppingProductCard";
import { LocationMap } from "@/components/location";
import { Button } from "@/components/ui/Button";
import { getProviderBySlugAction } from "@/lib/services/marketplace-actions";
import { getSellerProductsAction } from "@/lib/services/shopping-actions";
import type { SellerPublicProfile, ProductListItem } from "@/types/domain";

export default function SellerProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [seller, setSeller] = useState<SellerPublicProfile | null>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);

  useEffect(() => {
    if (!slug) return;
    getProviderBySlugAction(slug).then((res) => {
      if (res) {
        setSeller({
          ...res,
          selling_radius_km: res.service_radius_km || 50,
        });
        getSellerProductsAction(res.id).then((prds) => {
          setProducts(prds);
        });
      }
    });
  }, [slug]);

  if (!seller) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
          <h2 className="text-2xl font-bold">A carregar perfil do vendedor...</h2>
        </main>
        <Footer />
      </div>
    );
  }

  const mapMarkers = seller.latitude && seller.longitude ? [{
    id: seller.id,
    title: seller.business_name,
    category: "shopping" as const,
    latitude: seller.latitude,
    longitude: seller.longitude,
    provinceName: seller.province_name || "Angola",
    municipalityName: seller.municipality_name || undefined,
    description: seller.headline || undefined,
  }] : [];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        {/* Breadcrumb */}
        <div>
          <Link
            href="/agrishopping"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar ao AgriShopping</span>
          </Link>
        </div>

        {/* Seller Profile Header */}
        <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-10 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 flex items-center justify-center font-black text-3xl shrink-0 border border-border shadow-xs">
                <Store className="w-10 h-10" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                    {seller.business_name}
                  </h1>
                  {seller.verification_status === "verified" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Vendedor Verificado
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-primary">{seller.headline || "Fornecedor Agropecuário"}</p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {seller.municipality_name ? `${seller.municipality_name}, ` : ""}
                      {seller.province_name || "Angola"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-amber-600 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{seller.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground font-normal">
                      ({seller.reviews_count} avaliações)
                    </span>
                  </div>

                  <span>• Raio de Entrega: {seller.selling_radius_km} km</span>
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
                className="gap-1.5 text-xs font-bold cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Partilhar Loja</span>
              </Button>
            </div>
          </div>

          {seller.description && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Sobre a Loja / Produtor
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed max-w-4xl whitespace-pre-line">
                {seller.description}
              </p>
            </div>
          )}
        </div>

        {/* Seller Products Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Produtos Disponíveis ({products.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Produtos comercializados e fornecidos diretamente por {seller.business_name}
              </p>
            </div>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ShoppingProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-surface-card rounded-3xl p-8 text-center border border-border text-muted-foreground text-sm">
              Nenhum produto publicado no momento por este vendedor.
            </div>
          )}
        </div>

        {/* Seller Base Location Map */}
        <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-3">
          <h3 className="text-base font-bold text-foreground">Localização da Loja & Área de Entrega</h3>
          <div className="rounded-2xl overflow-hidden border border-border">
            <LocationMap
              markers={mapMarkers}
              height="h-[320px]"
              center={
                seller.latitude && seller.longitude
                  ? { latitude: seller.latitude, longitude: seller.longitude }
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
