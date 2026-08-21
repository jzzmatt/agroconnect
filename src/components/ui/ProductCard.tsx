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
        "bg-white rounded-2xl border border-emerald-900/10 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between group",
        className
      )}
    >
      <div>
        {/* Product Visual Area */}
        <div className="relative h-44 w-full bg-linear-to-br from-emerald-100/70 via-emerald-50 to-amber-50 p-4 flex flex-col justify-between overflow-hidden border-b border-emerald-100">
          <div className="flex items-center justify-between z-10">
            <Badge variant="pillarShopping" className="bg-white/90 text-amber-900">
              AgriShopping
            </Badge>
            <span className="text-[11px] font-bold text-emerald-950 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              {category}
            </span>
          </div>

          <div className="z-10 flex items-center justify-center h-20 text-emerald-700/70">
            <Package className="w-16 h-16 stroke-[1.25] text-emerald-800/40 group-hover:scale-110 transition-transform duration-300" />
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-2.5">
          <h3 className="font-bold text-base text-emerald-950 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
            {title}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-emerald-800">
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-emerald-950 truncate">{sellerName}</span>
            {isVerifiedSeller && (
              <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
            )}
          </div>

          <div className="pt-1">
            <LocationBadge provinceName={provinceName} municipalityName={municipalityName} size="sm" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 pt-0 flex items-center justify-between gap-3 border-t border-emerald-100/60 mt-2">
        <div>
          <span className="text-[10px] text-muted-foreground block">Preço</span>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-extrabold text-emerald-950">{priceFormatted}</span>
            <span className="text-[10px] text-muted-foreground">/{unit}</span>
          </div>
        </div>

        <Link href={`/agrishopping?product=${id}`}>
          <Button variant="primary" size="sm" className="gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Ver Produto</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
