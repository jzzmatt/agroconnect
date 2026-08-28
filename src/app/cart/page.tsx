"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart as CartIcon,
  ArrowRight,
  ShoppingBag,
  Trash2,
  Package,
} from "lucide-react";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { SectionHeader, EmptyState } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { CartItemList, OrderSummary } from "@/components/commerce";
import {
  getCartAction,
  updateCartItemQuantityAction,
  removeFromCartAction,
  clearCartAction,
} from "@/lib/services/commerce-actions";
import { useCart } from "@/components/commerce/CartProvider";
import type { ShoppingCart } from "@/types/domain";

export default function CartPage() {
  const [cart, setCart] = useState<ShoppingCart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { applyCart } = useCart();

  useEffect(() => {
    getCartAction().then((res) => {
      setCart(res);
      applyCart(res);
      setIsLoading(false);
    });
  }, [applyCart]);

  const apply = (next: ShoppingCart) => {
    setCart(next);
    applyCart(next);
  };

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    try {
      const updated = await updateCartItemQuantityAction(productId, quantity);
      if (!updated.success) {
        alert(updated.error || "Erro ao atualizar quantidade.");
        return;
      }
      apply(updated.cart);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar quantidade.");
    }
  };

  const handleRemoveItem = async (productId: string) => {
    const updated = await removeFromCartAction(productId);
    if (!updated.success) {
      alert(updated.error || "Erro ao remover o produto.");
      return;
    }
    apply(updated.cart);
  };

  const handleClearCart = async () => {
    const updated = await clearCartAction();
    if (!updated.success) {
      alert(updated.error || "Erro ao esvaziar o carrinho.");
      return;
    }
    apply(updated.cart);
  };

  if (isLoading || !cart) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-sm font-semibold text-muted-foreground">A carregar o seu carrinho...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <SectionHeader
            badgeText="AgriShopping • Carrinho"
            title="O Seu Carrinho de Compras"
            subtitle="Reveja os produtos, sementes, equipamentos e insumos antes de finalizar o pedido."
          />

          {cart.items.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-xs font-semibold text-destructive hover:underline flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Esvaziar Carrinho</span>
            </button>
          )}
        </div>

        {/* Content */}
        {cart.items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cart Items Column */}
            <div className="lg:col-span-8 space-y-4">
              <CartItemList
                items={cart.items}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
              />
            </div>

            {/* Summary Column */}
            <div className="lg:col-span-4 sticky top-20">
              <OrderSummary
                subtotal={cart.subtotal}
                deliveryFee={cart.delivery_fee}
                discount={cart.discount}
                total={cart.total}
                currency={cart.currency}
              />
            </div>
          </div>
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title="O seu carrinho está vazio"
            description="Explore os produtos de agricultores, sementes certificadas e equipamentos no AgriShopping."
            actionLabel="Explorar Produtos"
            onAction={() => {
              window.location.href = "/agrishopping";
            }}
          />
        )}
      </main>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
