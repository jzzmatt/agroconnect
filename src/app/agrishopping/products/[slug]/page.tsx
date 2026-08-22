"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Package,
  MapPin,
  Store,
  ShieldCheck,
  Send,
  Heart,
  Share2,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Truck,
  Sparkles,
} from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LocationMap } from "@/components/location";
import { ProductRequestModal } from "@/components/shopping/ProductRequestModal";
import { ShoppingProductCard } from "@/components/shopping/ShoppingProductCard";
import { getProductBySlugAction, searchProductsAction, toggleProductFavoriteAction } from "@/lib/services/shopping-actions";
import type { ProductListItem } from "@/types/domain";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<ProductListItem | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductListItem[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getProductBySlugAction(slug).then((res) => {
      if (res) {
        setProduct(res);
        searchProductsAction({
          categorySlug: res.category_slug || undefined,
          limit: 3,
        }).then((rel) => {
          setRelatedProducts(rel.products.filter((p) => p.id !== res.id));
        });
      }
    });
  }, [slug]);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
          <h2 className="text-2xl font-bold">A carregar produto...</h2>
          <p className="text-sm text-muted-foreground">Buscando informações do vendedor e stock disponível.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const formatPrice = (price: number, currency = "Kz") => {
    return `${new Intl.NumberFormat("pt-AO").format(price)} ${currency}`;
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const res = await toggleProductFavoriteAction(product.id);
      setIsFavorited(res.isFavorited);
    } catch {
      setIsFavorited(!isFavorited);
    }
  };

  const mapMarkers = product.latitude && product.longitude ? [{
    id: product.id,
    title: product.title,
    category: "shopping" as const,
    latitude: product.latitude,
    longitude: product.longitude,
    provinceName: product.province_name || "Angola",
    municipalityName: product.municipality_name || undefined,
    description: `${product.price} ${product.currency} / ${product.unit}`,
  }] : [];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/agrishopping"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar ao AgriShopping</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFavorite}
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

        {/* Main Product Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Product Visual + Description + Map */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-8 shadow-xs space-y-5">
              {/* Product Banner/Image placeholder */}
              <div className="h-64 sm:h-80 w-full rounded-2xl bg-linear-to-br from-secondary/60 via-surface to-muted border border-border flex items-center justify-center relative overflow-hidden">
                <Package className="w-24 h-24 text-amber-700/40 dark:text-amber-400/40" />
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge variant="pillarShopping">
                    {product.category_name || "AgriShopping"}
                  </Badge>
                  {product.is_featured && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                      <Sparkles className="w-3 h-3" />
                      Destaque
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
                  {product.title}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2">
                  <div className="flex items-center gap-1 text-primary font-bold">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {product.municipality_name ? `${product.municipality_name}, ` : ""}
                      {product.province_name || "Angola"}
                    </span>
                  </div>
                  {product.sku && <span>• SKU: {product.sku}</span>}
                  <span>• Condição: {product.condition === "new" ? "Novo" : "Usado"}</span>
                </div>
              </div>

              {/* Description */}
              <div className="pt-4 border-t border-border space-y-3">
                <h3 className="text-base font-bold text-foreground">Descrição do Produto</h3>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {product.description || "Sem descrição detalhada."}
                </p>
              </div>

              {/* Key Specs */}
              <div className="pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-semibold">
                <div className="p-3 bg-surface rounded-2xl border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Unidade</span>
                  <p className="text-foreground mt-0.5">{product.unit}</p>
                </div>
                <div className="p-3 bg-surface rounded-2xl border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Disponibilidade</span>
                  <p className="text-emerald-600 font-bold mt-0.5">
                    {product.availability_status === "in_stock" ? `Em Stock (${product.quantity})` : "Sob Encomenda"}
                  </p>
                </div>
                <div className="p-3 bg-surface rounded-2xl border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Raio de Entrega</span>
                  <p className="text-foreground mt-0.5">Até {product.selling_radius_km || 50} km</p>
                </div>
              </div>
            </div>

            {/* MapQuest Location Map */}
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-foreground">Localização do Vendedor & Entrega</h3>
              <div className="rounded-2xl overflow-hidden border border-border">
                <LocationMap
                  markers={mapMarkers}
                  height="h-[340px]"
                  center={
                    product.latitude && product.longitude
                      ? { latitude: product.latitude, longitude: product.longitude }
                      : undefined
                  }
                  zoom={11}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & Request Card */}
          <div className="lg:col-span-4 space-y-6 sticky top-20">
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-md space-y-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Preço por {product.unit}
                </span>
                <div className="text-2xl font-black text-foreground mt-0.5">
                  {formatPrice(product.price, product.currency)}
                </div>
              </div>

              {/* Action Button: Solicitar Produto / Cotação */}
              <Button
                variant="primary"
                size="lg"
                onClick={() => setIsRequestModalOpen(true)}
                className="w-full gap-2 font-bold h-12 text-sm shadow-md cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Solicitar / Contactar Vendedor</span>
              </Button>

              {/* Seller Summary */}
              <div className="pt-5 border-t border-border space-y-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Vendedor
                </span>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 flex items-center justify-center font-black text-lg border border-border">
                    <Store className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <h4 className="font-bold text-sm text-foreground truncate">
                        {product.seller_name}
                      </h4>
                      {product.seller_verified && (
                        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {product.municipality_name ? `${product.municipality_name}, ` : ""}
                      {product.province_name}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/sellers/${product.seller_slug}`}
                  className="block text-center text-xs font-bold text-primary hover:underline pt-1"
                >
                  Ver todos os produtos deste vendedor →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Product Request Modal */}
      <ProductRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        productId={product.id}
        productTitle={product.title}
        sellerId={product.seller_id}
        sellerName={product.seller_name}
        priceFormatted={formatPrice(product.price, product.currency)}
        unit={product.unit}
        maxAvailable={product.quantity}
      />

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
