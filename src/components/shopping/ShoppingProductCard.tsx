"use client";

import React from "react";
import Link from "next/link";
import {
  Package,
  MapPin,
  Store,
  ShieldCheck,
  Heart,
  Navigation,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ProductListItem } from "@/types/domain";
import { useI18n } from "@/i18n/provider";
import { isProductCategorySlug } from "@/config/product-catalog";

interface ShoppingProductCardProps {
  product: ProductListItem;
  onSelect?: (product: ProductListItem) => void;
  onToggleFavorite?: (productId: string) => void;
  isFavorited?: boolean;
  isSelected?: boolean;
  className?: string;
}

export function ShoppingProductCard({
  product,
  onSelect,
  onToggleFavorite,
  isFavorited = false,
  isSelected = false,
  className,
}: ShoppingProductCardProps) {
  const { dict } = useI18n();
  const formatPrice = (price: number, currency = "Kz") => {
    return `${new Intl.NumberFormat("pt-AO").format(price)} ${currency}`;
  };

  const getAvailabilityBadge = (status: string) => {
    switch (status) {
      case "in_stock":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {dict.products.inStock} ({product.quantity})
          </span>
        );
      case "limited":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
            {dict.products.limited}
          </span>
        );
      case "pre_order":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
            {dict.products.preOrder}
          </span>
        );
      case "out_of_stock":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
            {dict.products.outOfStock}
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => onSelect && onSelect(product)}
      className={cn(
        "bg-surface-card rounded-3xl border border-border p-5 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group relative select-none",
        isSelected && "ring-2 ring-primary border-primary shadow-md",
        className
      )}
    >
      <div>
        {/* Top badges & Favorite */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {product.is_featured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-2xs">
                <Sparkles className="w-3 h-3" />
                Destaque
              </span>
            )}
            <Badge variant="pillarShopping" className="text-[10px] font-bold">
              {isProductCategorySlug(product.category_slug)
                ? dict.products.categories[product.category_slug]
                : product.category_name || "AgriShopping"}
            </Badge>
            {product.has_video && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-900 text-white">
                ▶ {dict.shopping.videoBadge}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleFavorite) onToggleFavorite(product.id);
            }}
            className={cn(
              "p-2 rounded-full border transition-all cursor-pointer",
              isFavorited
                ? "bg-rose-50 dark:bg-rose-950 text-rose-600 border-rose-200 dark:border-rose-900"
                : "bg-surface hover:bg-muted text-muted-foreground border-border"
            )}
            aria-label="Guardar nos favoritos"
          >
            <Heart className={cn("w-4 h-4", isFavorited && "fill-rose-500 text-rose-500")} />
          </button>
        </div>

        {/* Product Visual Area */}
        <div className="relative w-full aspect-[4/3] rounded-2xl bg-linear-to-br from-secondary/60 via-surface to-muted flex items-center justify-center overflow-hidden border border-border mb-3 group-hover:border-primary/40 transition-colors">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={`${product.title} — AgriConnect`}
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading="lazy"
            />
          ) : (
            <Package className="w-14 h-14 text-amber-700/50 dark:text-amber-400/50 group-hover:scale-110 transition-transform duration-300" aria-hidden />
          )}
          <div className="absolute bottom-2 left-2">
            {getAvailabilityBadge(product.availability_status)}
          </div>
        </div>

        {/* Product Title */}
        <Link
          href={`/agrishopping/products/${product.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="block group-hover:text-primary transition-colors"
        >
          <h3 className="text-base font-bold text-foreground leading-snug line-clamp-2">
            {product.title}
          </h3>
        </Link>

        {/* Description */}
        {product.description && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Seller Info */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xs shrink-0">
              <Store className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-foreground truncate">
                  {product.seller_name}
                </span>
                {product.seller_verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Location & Distance */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-medium">
          <div className="flex items-center gap-1 text-primary font-semibold">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>
              {product.municipality_name ? `${product.municipality_name}, ` : ""}
              {product.province_name || "Angola"}
            </span>
          </div>

          {product.distance_km !== null && product.distance_km !== undefined && (
            <div className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md font-bold text-[10px]">
              <Navigation className="w-3 h-3 text-primary" />
              <span>{product.distance_km} km</span>
            </div>
          )}
        </div>
      </div>

      {/* Pricing & CTA */}
      <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Preço / {product.unit}
          </span>
          <span className="text-base font-black text-foreground">
            {formatPrice(product.price, product.currency)}
          </span>
        </div>

        <Link
          href={`/agrishopping/products/${product.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        >
          <Button variant="primary" size="sm" className="gap-1.5 font-bold text-xs h-9 px-3">
            <span>Ver produto</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
