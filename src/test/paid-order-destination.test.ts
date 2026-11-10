import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MY_COURSES_PATH, paidOrderDestination } from "@/lib/commerce/paid-order-destination";

describe("paid order destination", () => {
  it("opens the purchased course after a confirmed course payment", () => {
    expect(
      paidOrderDestination({
        payment_status: "paid",
        items: [{ course_id: "crs-1", product_slug: "gestao-de-milho" }],
      })
    ).toBe("/agriacademy/courses/gestao-de-milho/learn");
  });

  it("opens my courses when a paid order has more than one course", () => {
    expect(
      paidOrderDestination({
        payment_status: "paid",
        items: [
          { course_id: "crs-1", product_slug: "milho" },
          { course_id: "crs-2", product_slug: "horta" },
        ],
      })
    ).toBe(MY_COURSES_PATH);
  });

  it("opens the purchased product after a confirmed product payment", () => {
    expect(
      paidOrderDestination({
        payment_status: "paid",
        items: [{ product_id: "prd-1", product_slug: "semente-de-milho" }],
      })
    ).toBe("/agrishopping/products/semente-de-milho");
  });

  it("does not leave the order when payment is still incomplete", () => {
    const items = [{ course_id: "crs-1", product_slug: "gestao-de-milho" }];
    expect(paidOrderDestination({ payment_status: "pending", items })).toBeNull();
    expect(paidOrderDestination({ payment_status: "failed", items })).toBeNull();
    expect(paidOrderDestination({ payment_status: "cancelled", items })).toBeNull();
  });

  it("uses the destination from checkout and from the payment success page", () => {
    const checkout = readFileSync("src/app/checkout/page.tsx", "utf8");
    const success = readFileSync("src/app/orders/[orderNumber]/success/page.tsx", "utf8");
    expect(checkout).toContain("paidOrderDestination");
    expect(success).toContain("paidOrderDestination");
    expect(success).toContain("router.replace");
  });
});
