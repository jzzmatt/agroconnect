"use client";

import React, { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/commerce/CartProvider";
import {
  addToCartAction,
  updateCartItemQuantityAction,
} from "@/lib/services/commerce-actions";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

interface AddToCartControlProps {
  productId: string;
  disabled?: boolean;
  size?: "sm" | "lg";
  className?: string;
}

export function AddToCartControl({
  productId,
  disabled = false,
  size = "sm",
  className,
}: AddToCartControlProps) {
  const { dict } = useI18n();
  const { applyCart, quantityFor } = useCart();
  const quantity = quantityFor(productId);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (work: () => ReturnType<typeof addToCartAction>) => {
    setPending(true);
    setMessage(null);
    try {
      const result = await work();
      if (!result.success) {
        const authRequired = /não autorizado|unauthoriz|auth_required|inicie sessão|sign in/i.test(
          result.error || ""
        );
        setMessage(
          authRequired ? dict.shopping.cartAuthRequired : result.error || dict.shopping.cartUpdateError
        );
        return;
      }
      applyCart(result.cart);
    } catch {
      setMessage(dict.shopping.cartUpdateError);
    } finally {
      setPending(false);
    }
  };

  if (quantity > 0) {
    return (
      <div className={cn(size === "lg" && "w-full", className)}>
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-xl border border-input-border bg-surface p-1",
            size === "lg" && "w-full justify-between px-2 py-1"
          )}
        >
          <button
            type="button"
            disabled={pending || disabled}
            onClick={() => void run(() => updateCartItemQuantityAction(productId, quantity - 1))}
            className="p-1.5 rounded-lg hover:bg-muted text-foreground cursor-pointer disabled:opacity-50"
            aria-label={dict.shopping.decreaseQuantity}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="min-w-7 text-center text-xs font-black">{quantity}</span>
          <button
            type="button"
            disabled={pending || disabled}
            onClick={() => void run(() => addToCartAction({ productId, quantity: 1 }))}
            className="p-1.5 rounded-lg hover:bg-muted text-foreground cursor-pointer disabled:opacity-50"
            aria-label={dict.shopping.increaseQuantity}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {message ? <p className="text-[10px] text-destructive mt-1">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn(size === "lg" && "w-full", className)}>
      <Button
        type="button"
        variant="primary"
        size={size}
        disabled={pending || disabled}
        onClick={() => void run(() => addToCartAction({ productId, quantity: 1 }))}
        className={cn("gap-1.5 font-bold", size === "lg" && "w-full h-12 text-sm shadow-md")}
      >
        <ShoppingBag className="w-3.5 h-3.5" />
        <span>{dict.shopping.addToCart}</span>
      </Button>
      {message ? <p className="text-[10px] text-destructive mt-1">{message}</p> : null}
    </div>
  );
}
