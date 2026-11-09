import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  confirmedOrderIncome,
  confirmedReceivedTotal,
  decidePaymentConfirmation,
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
  status?: OrderDescriptor["status"];
}): OrderDescriptor {
  return {
    id: "ord-1",
    order_number: "AGC-2026-000099",
    customer_id: "cust-1",
    status: params.status || "paid",
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

describe("Seller earnings KPI for confirmed payments", () => {
  it("counts income only after the stored payment is paid", () => {
    expect(
      confirmedOrderIncome({
        paymentStatus: "pending",
        fulfillmentStatus: "completed",
        orderStatus: "pending_payment",
        orderTotal: 30000,
        productValue: 30000,
      })
    ).toBe(0);
    expect(
      confirmedOrderIncome({
        paymentStatus: "paid",
        fulfillmentStatus: "processing",
        orderStatus: "paid",
        orderTotal: 30000,
        productValue: 30000,
      })
    ).toBe(30000);
    expect(
      confirmedOrderIncome({
        paymentStatus: "failed",
        orderStatus: "failed",
        orderTotal: 30000,
        productValue: 30000,
      })
    ).toBe(0);
    expect(
      confirmedOrderIncome({
        paymentStatus: "paid",
        orderStatus: "cancelled",
        orderTotal: 30000,
        productValue: 30000,
      })
    ).toBe(0);
  });

  it("caps duplicate paid rows and scales a smaller confirmed amount", () => {
    expect(
      confirmedReceivedTotal(35000, "paid", [
        { status: "paid", amount: 35000 },
        { status: "paid", amount: 35000 },
      ])
    ).toBe(35000);
    expect(
      confirmedOrderIncome({
        paymentStatus: "paid",
        orderStatus: "paid",
        orderTotal: 35000,
        productValue: 30000,
        payments: [{ status: "paid", amount: 17500 }],
      })
    ).toBe(15000);
    expect(
      decidePaymentConfirmation({
        duplicateEvent: true,
        storedStatus: "paid",
        storedAmount: 35000,
        reportedStatus: "paid",
        reportedAmount: 35000,
      }).apply
    ).toBe(false);
    expect(
      decidePaymentConfirmation({
        duplicateEvent: false,
        storedStatus: "pending",
        storedAmount: 35000,
        reportedStatus: "paid",
        reportedAmount: 1,
      }).apply
    ).toBe(false);
    expect(
      decidePaymentConfirmation({
        duplicateEvent: false,
        storedStatus: "pending",
        storedAmount: 35000,
        reportedStatus: "paid",
        reportedAmount: 35000,
      })
    ).toEqual({ apply: true, nextStatus: "paid" });
  });

  it("uses product line value, not delivery fees, for the earnings KPI", () => {
    expect(
      sellerGroupProductValue({
        subtotal: 30000,
        total: 35000,
        items: [{ subtotal: 12000 }, { subtotal: 18000 }],
      })
    ).toBe(30000);
    expect(
      sellerGroupProductValue({
        subtotal: 30000,
        total: 35000,
        items: [{ subtotal: 0 }],
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

    expect(summary.total_earned).toBe(40000);
    expect(summary.completed_count).toBe(2);
    expect(summary.total_processing).toBe(0);
    expect(summary.processing_count).toBe(0);
  });

  it("counts a paid shipment and ignores a cancelled group", () => {
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

    expect(summary.total_earned).toBe(30000);
    expect(summary.completed_count).toBe(1);
    expect(summary.total_processing).toBe(0);
  });

  it("counts a parent order marked completed even if the group is still shipped", () => {
    const summary = summarizeSellerEarnings("seller-a", [
      order({
        payment_status: "paid",
        status: "completed",
        groups: [group({ seller_id: "seller-a", status: "shipped", subtotal: 30000 })],
      }),
    ]);
    expect(summary.total_earned).toBe(30000);
    expect(summary.completed_count).toBe(1);
    expect(summary.entries[0]?.status).toBe("completed");
    expect(summary.entries[0]?.total).toBe(30000);
  });

  it("does not treat a cancelled parent order as processing or earned", () => {
    const summary = summarizeSellerEarnings("seller-a", [
      order({
        payment_status: "paid",
        status: "cancelled",
        groups: [group({ seller_id: "seller-a", status: "processing", subtotal: 30000 })],
      }),
    ]);
    expect(summary.total_earned).toBe(0);
    expect(summary.total_processing).toBe(0);
    expect(summary.completed_count).toBe(0);
  });
});

describe("Earnings page displays completed order value", () => {
  it("renders completed product amounts on the KPI and the completed list", () => {
    const page = readFileSync("src/app/(dashboard)/dashboard/earnings/page.tsx", "utf8");
    const persist = readFileSync("src/lib/commerce/persist.ts", "utf8");
    const actions = readFileSync("src/lib/services/commerce-actions.ts", "utf8");
    expect(page).toContain("copy.completedOrders");
    expect(page).toContain("summary?.total_earned");
    expect(page).toContain("copy.completedList");
    expect(page).toContain("formatAmount(entry.total");
    expect(persist).toContain("confirmedOrderIncome");
    expect(persist).toContain("decidePaymentConfirmation");
    expect(page).toContain("formatDashboardAmount");
    expect(actions).toContain("Number(summary.total_earned)");
    expect(actions).toContain("Number(entry.total)");
  });
});
