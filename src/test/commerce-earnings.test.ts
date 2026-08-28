import { describe, expect, it } from "vitest";
import {
  isCompletedPaidProductGroup,
  sellerGroupProductValue,
  summarizeSellerEarnings,
} from "@/lib/commerce/persist";
import type { OrderDescriptor, OrderSellerGroupDescriptor } from "@/types/commerce";

function group(overrides: Partial<OrderSellerGroupDescriptor> & { seller_id: string; status: OrderSellerGroupDescriptor["status"] }): OrderSellerGroupDescriptor {
  return {
    id: overrides.id || `grp-${overrides.seller_id}`,
    order_id: "ord-1",
    seller_id: overrides.seller_id,
    seller_name: "Vendedor",
    status: overrides.status,
    delivery_status: "not_assigned",
    fulfillment_method: "delivery",
    subtotal: overrides.subtotal ?? 30000,
    delivery_fee: overrides.delivery_fee ?? 5000,
    total: overrides.total ?? (overrides.subtotal ?? 30000) + (overrides.delivery_fee ?? 5000),
    items: overrides.items ?? [
      {
        id: "item-1",
        order_id: "ord-1",
        product_id: "prd-1",
        seller_id: overrides.seller_id,
        product_title: "porco",
        unit: "unidade",
        quantity: 1,
        unit_price: overrides.subtotal ?? 30000,
        subtotal: overrides.subtotal ?? 30000,
        currency: "AOA",
      },
    ],
  };
}

function order(params: {
  payment_status: OrderDescriptor["payment_status"];
  groups: OrderSellerGroupDescriptor[];
}): OrderDescriptor {
  return {
    id: "ord-1",
    order_number: "AGC-2026-000099",
    customer_id: "cust-1",
    status: "paid",
    payment_status: params.payment_status,
    fulfillment_method: "delivery",
    currency: "AOA",
    subtotal: 30000,
    delivery_fee: 5000,
    discount: 0,
    tax: 0,
    total: 35000,
    shipping_address: null,
    items: params.groups.flatMap((entry) => entry.items),
    seller_groups: params.groups,
    payment: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe("Seller earnings KPI for completed products", () => {
  it("counts only paid seller groups whose fulfillment is completed", () => {
    expect(
      isCompletedPaidProductGroup({ paymentStatus: "paid", fulfillmentStatus: "completed" })
    ).toBe(true);
    expect(
      isCompletedPaidProductGroup({ paymentStatus: "paid", fulfillmentStatus: "shipped" })
    ).toBe(false);
    expect(
      isCompletedPaidProductGroup({ paymentStatus: "paid", fulfillmentStatus: "processing" })
    ).toBe(false);
    expect(
      isCompletedPaidProductGroup({ paymentStatus: "pending", fulfillmentStatus: "completed" })
    ).toBe(false);
  });

  it("uses product line value, not delivery fees, for the earnings KPI", () => {
    expect(
      sellerGroupProductValue({
        subtotal: 30000,
        total: 35000,
        items: [{ subtotal: 12000 }, { subtotal: 18000 }],
      })
    ).toBe(30000);
  });

  it("sums completed product value across every session seller id", () => {
    const summary = summarizeSellerEarnings(
      ["seller-a", "seller-b"],
      [
        order({
          payment_status: "paid",
          groups: [
            group({ seller_id: "seller-a", status: "processing", subtotal: 10000, total: 15000 }),
            group({
              seller_id: "seller-b",
              status: "completed",
              subtotal: 30000,
              total: 35000,
            }),
          ],
        }),
      ]
    );

    expect(summary.total_earned).toBe(30000);
    expect(summary.completed_count).toBe(1);
    expect(summary.total_processing).toBe(10000);
    expect(summary.processing_count).toBe(1);
  });

  it("does not treat shipped or cancelled product groups as earned", () => {
    const summary = summarizeSellerEarnings("seller-a", [
      order({
        payment_status: "paid",
        groups: [group({ seller_id: "seller-a", status: "shipped", subtotal: 30000 })],
      }),
      order({
        payment_status: "paid",
        groups: [group({ seller_id: "seller-a", status: "cancelled", subtotal: 90000 })],
      }),
    ]);

    expect(summary.total_earned).toBe(0);
    expect(summary.completed_count).toBe(0);
    expect(summary.total_processing).toBe(30000);
  });
});
