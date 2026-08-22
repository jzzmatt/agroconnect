"use client";

import React from "react";
import Link from "next/link";
import { Trash2, Plus, Minus, Store, Package } from "lucide-react";
import type { CartItemDescriptor } from "@/types/domain";

interface CartItemListProps {
  items: CartItemDescriptor[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
}

export function CartItemList({ items, onUpdateQuantity, onRemoveItem }: CartItemListProps) {
  // Group items by seller
  const sellerGroups = items.reduce((acc, item) => {
    const list = acc.get(item.seller_id) || [];
    list.push(item);
    acc.set(item.seller_id, list);
    return acc;
  }, new Map<string, CartItemDescriptor[]>());

  return (
    <div className="space-y-6">
      {Array.from(sellerGroups.entries()).map(([sellerId, sellerItems]) => {
        const sellerName = sellerItems[0]?.seller_name || "Vendedor Agropecuário";

        return (
          <div
            key={sellerId}
            className="bg-surface-card rounded-3xl border border-border overflow-hidden shadow-xs"
          >
            {/* Seller Group Header */}
            <div className="px-6 py-3.5 bg-surface border-b border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">{sellerName}</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-semibold">
                {sellerItems.length} {sellerItems.length === 1 ? "item" : "itens"}
              </span>
            </div>

            {/* Seller Items */}
            <div className="divide-y divide-border">
              {sellerItems.map((item) => (
                <div
                  key={item.id}
                  className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-2xl bg-secondary/70 border border-border flex items-center justify-center shrink-0">
                      <Package className="w-8 h-8 text-amber-700/60 dark:text-amber-400/60" />
                    </div>

                    <div className="min-w-0">
                      <Link
                        href={`/agrishopping/products/${item.slug}`}
                        className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-2"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Intl.NumberFormat("pt-AO").format(item.unit_price)} {item.currency} / {item.unit}
                      </p>
                    </div>
                  </div>

                  {/* Quantity and Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0">
                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2 bg-surface rounded-xl border border-input-border p-1">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                        className="p-1 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-foreground px-2 min-w-[24px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                        className="p-1 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right min-w-[100px]">
                      <span className="text-xs font-black text-foreground block">
                        {new Intl.NumberFormat("pt-AO").format(item.subtotal)} {item.currency}
                      </span>
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.product_id)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title="Remover produto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
