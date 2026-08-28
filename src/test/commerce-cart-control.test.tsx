import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "@/i18n/provider";
import { CartProvider } from "@/components/commerce/CartProvider";
import { AddToCartControl } from "@/components/commerce/AddToCartControl";
import { NavbarCartLink } from "@/components/commerce/NavbarCartLink";
import { emptyShoppingCart } from "@/lib/commerce/serialize";
import type { ShoppingCart } from "@/types/commerce";

const getCartAction = vi.fn();
const addToCartAction = vi.fn();
const updateCartItemQuantityAction = vi.fn();

vi.mock("@/lib/services/commerce-actions", () => ({
  getCartAction: (...args: unknown[]) => getCartAction(...args),
  addToCartAction: (...args: unknown[]) => addToCartAction(...args),
  updateCartItemQuantityAction: (...args: unknown[]) => updateCartItemQuantityAction(...args),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function cartWithQuantity(quantity: number): ShoppingCart {
  const base = emptyShoppingCart("usr-1");
  if (quantity <= 0) return base;
  return {
    ...base,
    items: [
      {
        id: "line-1",
        product_id: "prd-1",
        seller_id: "sel-1",
        seller_name: "Fazenda",
        title: "Milho",
        slug: "milho",
        unit_price: 100,
        quantity,
        unit: "kg",
        subtotal: quantity * 100,
        currency: "AOA",
        image_url: null,
        is_available: true,
      },
    ],
    items_count: quantity,
    subtotal: quantity * 100,
    total: quantity * 100,
    sellers_count: 1,
  };
}

function renderCartUi() {
  return render(
    <I18nProvider>
      <CartProvider>
        <NavbarCartLink />
        <AddToCartControl productId="prd-1" />
      </CartProvider>
    </I18nProvider>
  );
}

describe("Cart quantity stepper and navbar badge", () => {
  beforeEach(() => {
    getCartAction.mockReset();
    addToCartAction.mockReset();
    updateCartItemQuantityAction.mockReset();
    getCartAction.mockResolvedValue(emptyShoppingCart());
  });

  it("turns the add button into a stepper and increments the navbar badge", async () => {
    addToCartAction.mockResolvedValue({ success: true, cart: cartWithQuantity(1) });
    renderCartUi();

    fireEvent.click(await screen.findByRole("button", { name: /Adicionar ao carrinho/i }));

    await waitFor(() => {
      expect(screen.getAllByText("1")).toHaveLength(2);
      expect(screen.getByLabelText("Carrinho")).toHaveTextContent("1");
    });
    expect(screen.queryByRole("button", { name: /Adicionar ao carrinho/i })).toBeNull();
    expect(screen.getByLabelText("Aumentar quantidade")).toBeInTheDocument();
  });

  it("shows a sign-in message instead of throwing when add-to-cart is unauthorized", async () => {
    addToCartAction.mockResolvedValue({
      success: false,
      cart: emptyShoppingCart(),
      error: "Não autorizado: Perfil de utilizador não encontrado.",
    });
    renderCartUi();

    fireEvent.click(await screen.findByRole("button", { name: /Adicionar ao carrinho/i }));

    await waitFor(() => {
      expect(screen.getByText("Inicie sessão para adicionar produtos ao carrinho.")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Adicionar ao carrinho/i })).toBeInTheDocument();
  });
});
