"use client";

import React, { useState } from "react";
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
  Sparkles,
} from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProductRequestModal } from "@/components/shopping/ProductRequestModal";
import { BunnyPlayer } from "@/components/academy/BunnyPlayer";
import { toggleProductFavoriteAction } from "@/lib/services/shopping-actions";
import { useI18n } from "@/i18n/provider";
import type { ProductListItem } from "@/types/domain";

interface ProductDetailViewProps {
  product: ProductListItem;
}

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const { dict } = useI18n();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const localizationHref = `/agrilocalizacao?vendorId=${product.seller_id}`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/agrishopping"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{dict.products.backToProducts}</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-8 shadow-xs space-y-5">
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-2xl bg-linear-to-br from-secondary/60 via-surface to-muted border border-border overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="absolute inset-0 w-full h-full object-contain object-center bg-surface"
                    loading="eager"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="w-24 h-24 text-amber-700/40 dark:text-amber-400/40" />
                  </div>
                )}
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

              {product.has_video && (
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-foreground">{dict.products.videoLabel}</h3>
                  <BunnyPlayer
                    playbackUrl={product.video_playback_url}
                    title={product.title}
                    ready={product.video_status === "ready"}
                  />
                  {product.video_status !== "ready" && (
                    <p className="text-[11px] text-muted-foreground">
                      {dict.products.publishedVideoProcessing}
                    </p>
                  )}
                </div>
              )}

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
                  <span>• {dict.products.condition}: {product.condition === "new" ? dict.products.conditionNew : dict.products.conditionUsed}</span>
                </div>

                <div className="pt-4">
                  <Link
                    href={localizationHref}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 bg-primary/5 text-primary text-xs font-bold hover:bg-primary/10 transition-colors"
                    title={dict.products.viewLocation}
                  >
                    <MapPin className="w-4 h-4" />
                    <span>{dict.products.viewLocation}</span>
                  </Link>
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <h3 className="text-base font-bold text-foreground">{dict.products.description}</h3>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {product.description || "Sem descrição detalhada."}
                </p>
              </div>

              <div className="pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-semibold">
                <div className="p-3 bg-surface rounded-2xl border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">{dict.products.unit}</span>
                  <p className="text-foreground mt-0.5">{product.unit}</p>
                </div>
                <div className="p-3 bg-surface rounded-2xl border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">{dict.products.stockStatus}</span>
                  <p className="text-emerald-600 font-bold mt-0.5">
                    {product.availability_status === "in_stock" ? `${dict.products.inStock} (${product.quantity})` : dict.products.preOrder}
                  </p>
                </div>
                <div className="p-3 bg-surface rounded-2xl border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">{dict.products.radius}</span>
                  <p className="text-foreground mt-0.5">{product.selling_radius_km || 50} km</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6 sticky top-20">
            <div className="bg-surface-card rounded-3xl border border-border p-6 shadow-md space-y-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  {dict.products.price} / {product.unit}
                </span>
                <div className="text-2xl font-black text-foreground mt-0.5">
                  {formatPrice(product.price, product.currency)}
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={async () => {
                    const { addToCartAction } = await import("@/lib/services/commerce-actions");
                    await addToCartAction({ productId: product.id, quantity: 1 });
                    alert("Produto adicionado ao carrinho!");
                  }}
                  className="w-full gap-2 font-bold h-12 text-sm shadow-md cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>Adicionar ao Carrinho</span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsRequestModalOpen(true)}
                  className="w-full gap-2 font-bold h-11 text-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Pedir Cotação Especial</span>
                </Button>
              </div>

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
