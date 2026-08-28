"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/commerce/CartProvider";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export function NavbarCartLink({ className }: { className?: string }) {
  const { dict } = useI18n();
  const { itemsCount } = useCart();
  const [pulse, setPulse] = useState(false);
  const [lastCount, setLastCount] = useState(itemsCount);

  useEffect(() => {
    if (itemsCount > lastCount) {
      setPulse(true);
      const timer = window.setTimeout(() => setPulse(false), 600);
      setLastCount(itemsCount);
      return () => window.clearTimeout(timer);
    }
    setLastCount(itemsCount);
    return undefined;
  }, [itemsCount, lastCount]);

  return (
    <Link
      href="/cart"
      className={cn(
        "p-2 rounded-xl text-foreground hover:bg-muted relative transition-colors",
        className
      )}
      title={dict.navigation.cart}
      aria-label={dict.navigation.cart}
    >
      <ShoppingBag className={cn("w-5 h-5 text-primary", pulse && "scale-110")} />
      {itemsCount > 0 ? (
        <span
          className={cn(
            "absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center",
            pulse && "animate-bounce"
          )}
        >
          {itemsCount > 99 ? "99+" : itemsCount}
        </span>
      ) : null}
    </Link>
  );
}
