import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";
import { LocationBadge } from "@/components/location";
import { ShoppingBag, Package, Store, CheckCircle } from "lucide-react";
import { Button } from "./Button";
import Link from "next/link";

export interface ProductCardProps {
  id: string;
  title: string;
  sellerName: string;
  category: string;
  priceFormatted: string;
  unit?: string;
  provinceName: string;
  municipalityName?: string;
  stockAvailable?: number;
  isVerifiedSeller?: boolean;
  imageUrl?: string;
  className?: string;
}

export function ProductCard({
  id,
  title,
  sellerName,
  category,
  priceFormatted,
  unit = "unidade",
  provinceName,
  municipalityName,
  stockAvailable = 50,
  isVerifiedSeller = true,
  imageUrl,
  className,
}: ProductCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-card rounded-3xl border border-border overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between group",
        className
      )}
    >
      <div>
        {/* Product Visual Area */}
        <div className="relative h-44 w-full bg-linear-to-br from-secondary via-surface to-muted p-4 flex flex-col justify-between overflow-hidden border-b border-border">
          <div className="flex items-center justify-between z-10">
            <Badge variant="pillarShopping" className="bg-white/90 dark:bg-slate-900 text-amber-900 dark:text-amber-200">
              AgriShopping
            </Badge>
            <span className="text-[11px] font-bold text-foreground bg-surface-elevated/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-border">
              {category}
            </span>
          </div>

          <div className="z-10 flex items-center justify-center h-20 text-muted-foreground/60">
            <Package className="w-16 h-16 stroke-[1.25] text-primary/40 group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-2.5">
          <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Store className="w-3.5 h-3.5 text-primary" />
            <span className="font-bold text-foreground truncate">{sellerName}</span>
            {isVerifiedSeller && (
              <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
            )}
          </div>

          <div className="pt-1">
            <LocationBadge provinceName={provinceName} municipalityName={municipalityName} size="sm" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 pt-0 flex items-center justify-between gap-3 border-t border-border mt-2">
        <div>
          <span className="text-[10px] text-muted-foreground block">Preço</span>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-black text-foreground">{priceFormatted}</span>
            <span className="text-[10px] text-muted-foreground">/{unit}</span>
          </div>
        </div>

        <Link href={`/agrishopping?product=${id}`}>
          <Button variant="primary" size="sm" className="gap-1.5 font-bold">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Ver Produto</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
