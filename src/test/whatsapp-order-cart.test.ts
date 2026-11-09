import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  addGuestProduct,
  cartCheckoutHref,
  mergeGuestIntoAccount,
  parseGuestCart,
  planWhatsappOrder,
  serializeGuestCart,
} from "@/lib/commerce/guest-cart";

const PRODUCT = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";

describe("WhatsApp order cart", () => {
  it("opens the cart for a guest and does not send them to sign-up first", () => {
    const plan = planWhatsappOrder({
      productId: PRODUCT,
      signedIn: false,
      productAvailable: true,
      guestLines: [],
    });
    expect(plan.kind).toBe("guest-cart");
    if (plan.kind !== "guest-cart") return;
    expect(plan.lines).toEqual([{ productId: PRODUCT, quantity: 1 }]);
    expect(cartCheckoutHref(false)).toBe("/sign-in?redirect_url=%2Fcheckout");
    expect(cartCheckoutHref(false)).not.toContain("/sign-up");
  });

  it("keeps one unit when the same WhatsApp order link is opened twice", () => {
    const once = addGuestProduct([], PRODUCT, 1, true);
    const again = addGuestProduct(once, PRODUCT, 1, true);
    expect(again).toEqual([{ productId: PRODUCT, quantity: 1 }]);
  });

  it("sends a signed-in customer straight to the existing checkout", () => {
    const plan = planWhatsappOrder({
      productId: PRODUCT,
      signedIn: true,
      productAvailable: true,
      guestLines: [],
    });
    expect(plan).toEqual({ kind: "account-cart" });
    expect(cartCheckoutHref(true)).toBe("/checkout");
  });

  it("restores the guest cart onto the account cart after sign-in", () => {
    const account = [{ productId: PRODUCT, quantity: 1 }];
    const guest = parseGuestCart(
      serializeGuestCart([
        { productId: PRODUCT, quantity: 1 },
        { productId: OTHER, quantity: 2 },
      ])
    );
    expect(mergeGuestIntoAccount(account, guest)).toEqual([
      { productId: PRODUCT, quantity: 2 },
      { productId: OTHER, quantity: 2 },
    ]);
  });

  it("wires the order route, public cart, and post-submit sign-in", () => {
    const order = readFileSync("src/app/order/[productId]/route.ts", "utf8");
    const cart = readFileSync("src/app/cart/page.tsx", "utf8");
    const actions = readFileSync("src/lib/services/commerce-actions.ts", "utf8");
    const signIn = readFileSync("src/app/sign-in/[[...sign-in]]/page.tsx", "utf8");
    const encomendar = readFileSync("src/app/agrishopping/products/[slug]/encomendar/route.ts", "utf8");
    expect(order).toContain('new URL("/cart"');
    expect(order).toContain("applyGuestCartCookie");
    expect(order).not.toContain("sign-in");
    expect(cart).toContain("cartCheckoutHref");
    expect(actions).toContain("claimGuestCart");
    expect(signIn).toContain("redirect_url");
    expect(encomendar).toContain("/order/${product.id}?source=whatsapp");
  });
});
