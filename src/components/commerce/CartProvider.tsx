"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCartAction } from "@/lib/services/commerce-actions";
import { emptyShoppingCart } from "@/lib/commerce/serialize";
import type { ShoppingCart } from "@/types/commerce";

interface CartContextValue {
  cart: ShoppingCart;
  itemsCount: number;
  ready: boolean;
  applyCart: (next: ShoppingCart) => void;
  refreshCart: () => Promise<ShoppingCart>;
  quantityFor: (productId: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<ShoppingCart>(() => emptyShoppingCart());
  const [ready, setReady] = useState(false);

  const applyCart = useCallback((next: ShoppingCart) => {
    setCart(next);
    setReady(true);
  }, []);

  const refreshCart = useCallback(async () => {
    const next = await getCartAction();
    setCart(next);
    setReady(true);
    return next;
  }, []);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      itemsCount: cart.items_count,
      ready,
      applyCart,
      refreshCart,
      quantityFor: (productId: string) =>
        cart.items.find((item) => item.product_id === productId)?.quantity || 0,
    }),
    [applyCart, cart, ready, refreshCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return {
      cart: emptyShoppingCart(),
      itemsCount: 0,
      ready: false,
      applyCart: () => undefined,
      refreshCart: async () => emptyShoppingCart(),
      quantityFor: () => 0,
    };
  }
  return ctx;
}
