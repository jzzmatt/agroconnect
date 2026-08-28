import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  cartErrorMessage,
  emptyShoppingCart,
  toSerializableCart,
} from "@/lib/commerce/serialize";
import { buildOrderReceiptHtml, buildOrderReceiptText } from "@/lib/commerce/order-receipt";
import {
  canPermanentlyDeleteProduct,
  deleteDialogForProductStatus,
} from "@/lib/products/delete-flow";
import { ShoppingService, INITIAL_PRODUCTS } from "@/lib/services/shopping-service";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { getDictionary } from "@/i18n";
import type { OrderDescriptor } from "@/types/commerce";

const sampleOrder: OrderDescriptor = {
  id: "ord-1",
  order_number: "AGC-1001",
  customer_id: "usr-1",
  status: "paid",
  payment_status: "paid",
  fulfillment_method: "delivery",
  currency: "AOA",
  subtotal: 28500,
  delivery_fee: 0,
  discount: 0,
  tax: 0,
  total: 28500,
  items: [
    {
      id: "item-1",
      order_id: "ord-1",
      product_id: "prd-seed-1",
      seller_id: "prov-seed-1",
      product_title: "Semente de Milho",
      unit: "saco",
      quantity: 2,
      unit_price: 14250,
      subtotal: 28500,
      currency: "AOA",
    },
  ],
  seller_groups: [],
  created_at: "2026-08-28T10:00:00.000Z",
  updated_at: "2026-08-28T10:00:00.000Z",
};

describe("Commerce cart UX, product delete and receipts", () => {
  it("serializes carts into plain JSON-safe objects", () => {
    const cart = toSerializableCart({
      ...emptyShoppingCart("usr-1"),
      items: [
        {
          id: "line-1",
          product_id: "prd-1",
          seller_id: "sel-1",
          seller_name: "Fazenda",
          title: "Milho",
          slug: "milho",
          unit_price: "100" as unknown as number,
          quantity: "2" as unknown as number,
          unit: "kg",
          subtotal: "200" as unknown as number,
          currency: "AOA",
          image_url: null,
          is_available: true,
        },
      ],
      items_count: "2" as unknown as number,
      subtotal: "200" as unknown as number,
      total: "200" as unknown as number,
      sellers_count: "1" as unknown as number,
    });

    expect(cart.items[0].unit_price).toBe(100);
    expect(cart.items[0].quantity).toBe(2);
    expect(cart.items_count).toBe(2);
    expect(JSON.parse(JSON.stringify(cart)).id).toBe(cart.id);
  });

  it("hides minified React #441 details from cart error messages", () => {
    expect(cartErrorMessage(new Error("Minified React error #441"), "fallback")).toBe("fallback");
    expect(cartErrorMessage(new Error("Stock insuficiente"), "fallback")).toBe("Stock insuficiente");
  });

  it("only allows deleting draft, paused or archived products", () => {
    expect(canPermanentlyDeleteProduct("draft")).toBe(true);
    expect(canPermanentlyDeleteProduct("paused")).toBe(true);
    expect(canPermanentlyDeleteProduct("archived")).toBe(true);
    expect(canPermanentlyDeleteProduct("published")).toBe(false);
    expect(canPermanentlyDeleteProduct("active")).toBe(false);
    expect(deleteDialogForProductStatus("published")).toBe("published_block");
    expect(deleteDialogForProductStatus("draft")).toBe("confirm_delete");
  });

  it("refuses to delete a published catalogue product", async () => {
    const published = INITIAL_PRODUCTS.find((item) => item.status === "published" || item.status === "active");
    expect(published).toBeDefined();
    const result = await ShoppingService.deleteProduct(published!.id, published!.seller_id);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Pausa ou arquiva/i);
    expect(INITIAL_PRODUCTS.some((item) => item.id === published!.id)).toBe(true);
  });

  it("deletes a draft product from the in-memory catalogue without touching seed rows", async () => {
    if (isSupabaseConfigured()) return;
    const draft = INITIAL_PRODUCTS.find((item) => item.status === "draft");
    expect(draft).toBeDefined();
    const tempId = "prd-temp-delete-ux";
    INITIAL_PRODUCTS.push({ ...draft!, id: tempId, slug: `${draft!.slug}-temp-delete` });
    const result = await ShoppingService.deleteProduct(tempId, draft!.seller_id);
    expect(result.success).toBe(true);
    expect(INITIAL_PRODUCTS.some((item) => item.id === tempId)).toBe(false);
    expect(INITIAL_PRODUCTS.some((item) => item.id === draft!.id)).toBe(true);
  });

  it("builds Portuguese receipt text and printable HTML", () => {
    const text = buildOrderReceiptText(sampleOrder);
    const html = buildOrderReceiptHtml(sampleOrder);
    expect(text).toContain("AGC-1001");
    expect(text).toContain("Semente de Milho");
    expect(html).toContain("AGC-1001");
    expect(html).toContain("Semente de Milho");
    expect(html).not.toContain("<script");
  });

  it("exposes cart, receipt and delete copy in pt/en/fr", () => {
    const pt = getDictionary("pt");
    const en = getDictionary("en");
    const fr = getDictionary("fr");
    expect(pt.shopping.increaseQuantity).toMatch(/Aumentar/);
    expect(en.shopping.decreaseQuantity).toMatch(/Decrease/i);
    expect(fr.commerceReceipt.savePdf).toMatch(/PDF/);
    expect(pt.commerceReceipt.sendEmail).toMatch(/e-mail/i);
    expect(en.shopping.deletePublishedBlock).toMatch(/Pause or archive/i);
  });

  it("wires live cart badge, quantity stepper, seller delete and receipt export", () => {
    const navbar = readFileSync("src/components/navigation/Navbar.tsx", "utf8");
    const card = readFileSync("src/components/shopping/ShoppingProductCard.tsx", "utf8");
    const detail = readFileSync("src/app/agrishopping/products/[slug]/page.tsx", "utf8");
    const cartPage = readFileSync("src/app/cart/page.tsx", "utf8");
    const success = readFileSync("src/app/orders/[orderNumber]/success/page.tsx", "utf8");
    const order = readFileSync("src/app/orders/[orderNumber]/page.tsx", "utf8");
    const products = readFileSync("src/components/shopping/ProductsWorkspacePage.tsx", "utf8");
    const editor = readFileSync("src/components/shopping/ProductEditWorkspacePage.tsx", "utf8");
    const actions = readFileSync("src/lib/services/shopping-actions.ts", "utf8");

    expect(navbar).toContain("NavbarCartLink");
    expect(card).toContain("AddToCartControl");
    expect(detail).toContain("AddToCartControl");
    expect(detail).not.toContain("addToCartAction({ productId: product.id");
    expect(cartPage).toContain("updated.success");
    expect(cartPage).toContain("removeFromCartAction");
    expect(success).toContain("OrderReceiptActions");
    expect(order).toContain("OrderReceiptActions");
    expect(products).toContain("deleteProductAction");
    expect(editor).toContain("deleteProductAction");
    expect(actions).toContain("export async function deleteProductAction");
    expect(actions).toContain('authorize("product.delete")');
  });
});
