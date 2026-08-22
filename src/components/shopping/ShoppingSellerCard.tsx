"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Star,
  MapPin,
  Package,
  Store,
  Phone,
  Mail,
  Globe,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { SellerPublicProfile } from "@/types/domain";

interface ShoppingSellerCardProps {
  seller: SellerPublicProfile;
  className?: string;
}

export function ShoppingSellerCard({ seller, className }: ShoppingSellerCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-card rounded-3xl border border-border p-6 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group",
        className
      )}
    >
      <div>
        {/* Header with Avatar & Name */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 flex items-center justify-center font-black text-xl shrink-0 border border-border shadow-xs">
            <Store className="w-7 h-7" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/sellers/${seller.slug}`}
                className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate"
              >
                {seller.business_name}
              </Link>
              {seller.verification_status === "verified" && (
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              )}
            </div>
            <p className="text-xs font-semibold text-primary mt-0.5">
              {seller.headline || "Vendedor Agropecuário Verificado"}
            </p>
          </div>
        </div>

        {/* Description */}
        {seller.description && (
          <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
            {seller.description}
          </p>
        )}

        {/* Ratings & Metrics */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>{seller.rating.toFixed(1)}</span>
            <span className="text-[10px] text-muted-foreground font-normal">
              ({seller.reviews_count} avaliações)
            </span>
          </div>

          {seller.products_count !== undefined && (
            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Package className="w-3.5 h-3.5 text-primary" />
              <span>{seller.products_count} produtos</span>
            </div>
          )}
        </div>

        {/* Location & Coverage */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            {seller.municipality_name ? `${seller.municipality_name}, ` : ""}
            {seller.province_name || "Angola"}
          </span>
          <span className="text-[10px] text-muted-foreground/80">
            • Entrega até {seller.selling_radius_km} km
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-3 border-t border-border flex items-center justify-end">
        <Link href={`/sellers/${seller.slug}`} className="w-full">
          <Button variant="outline" className="w-full justify-between font-bold text-xs h-9">
            <span>Ver loja e produtos</span>
            <ArrowRight className="w-3.5 h-3.5 text-primary" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
