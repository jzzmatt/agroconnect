import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildAgriprofileOverview,
  countActiveConsultations,
  countCompletedSoldUnits,
  formatDashboardAmount,
  selectUpcomingAppointments,
  sumOwnedCourseStats,
} from "@/lib/agriprofile/overview";
import type { OrderDescriptor, OrderSellerGroupDescriptor } from "@/types/commerce";
import type { ServiceRequestItem } from "@/types/agriexpert";

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function group(
  overrides: Partial<OrderSellerGroupDescriptor> & {
    seller_id: string;
    status: OrderSellerGroupDescriptor["status"];
  }
): OrderSellerGroupDescriptor {
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
        product_title: "Milho",
        unit: "saco",
        quantity: 2,
        unit_price: 15000,
        subtotal: 30000,
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

function request(overrides: Partial<ServiceRequestItem>): ServiceRequestItem {
  return {
    id: overrides.id || "req-1",
    customer_id: "cust-1",
    provider_id: "prov-1",
    status: overrides.status || "pending",
    currency: "AOA",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    service_title: overrides.service_title || "Consulta",
    requested_date: overrides.requested_date,
    location_notes: overrides.location_notes,
  };
}

describe("AgriProfile dashboard overview KPIs", () => {
  it("counts completed product units and ignores processing or cancelled groups", () => {
    const completed = countCompletedSoldUnits([
      order({
        payment_status: "paid",
        groups: [
          group({ seller_id: "seller-a", status: "completed" }),
          group({
            seller_id: "seller-a",
            status: "processing",
            items: [
              {
                id: "item-2",
                order_id: "ord-1",
                product_id: "prd-2",
                seller_id: "seller-a",
                product_title: "Soja",
                unit: "saco",
                quantity: 9,
                unit_price: 10000,
                subtotal: 90000,
                currency: "AOA",
              },
            ],
          }),
        ],
      }),
    ]);
    expect(completed).toBe(2);

    const cancelled = countCompletedSoldUnits([
      order({
        payment_status: "paid",
        status: "cancelled",
        groups: [group({ seller_id: "seller-a", status: "completed" })],
      }),
    ]);
    expect(cancelled).toBe(0);
  });

  it("sums course sales from owned enrollments and skips drafts", () => {
    const stats = sumOwnedCourseStats(
      [
        { id: "c1", price: 25000, status: "published" },
        { id: "c2", price: 10000, status: "draft" },
        { id: "c3", price: 5000, status: "paused" },
      ],
      { c1: 2, c2: 10, c3: 1 }
    );
    expect(stats.totalStudents).toBe(3);
    expect(stats.courseSales).toBe(55000);
  });

  it("counts pending and accepted requests as active consultations", () => {
    expect(
      countActiveConsultations([
        request({ status: "pending" }),
        request({ id: "req-2", status: "accepted" }),
        request({ id: "req-3", status: "completed" }),
        request({ id: "req-4", status: "rejected" }),
      ])
    ).toBe(2);
  });

  it("selects upcoming accepted appointments from today onward", () => {
    const now = new Date(2026, 7, 28, 12, 0, 0);
    const upcoming = selectUpcomingAppointments(
      [
        request({
          id: "past",
          status: "accepted",
          requested_date: "2026-08-20",
          service_title: "Passado",
        }),
        request({
          id: "today",
          status: "accepted",
          requested_date: "2026-08-28",
          service_title: "Hoje",
          location_notes: "Huambo",
        }),
        request({
          id: "pending",
          status: "pending",
          requested_date: "2026-08-30",
          service_title: "Pendente",
        }),
      ],
      now
    );
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].id).toBe("today");
    expect(upcoming[0].location).toBe("Huambo");
  });

  it("adds product earnings and course sales into total earnings", () => {
    const overview = buildAgriprofileOverview({
      currency: "AOA",
      productEarnings: 40000,
      orders: [
        order({
          payment_status: "paid",
          groups: [group({ seller_id: "seller-a", status: "completed" })],
        }),
      ],
      courses: [{ id: "c1", price: 10000, status: "published" }],
      enrollmentCounts: { c1: 3 },
      requests: [request({ status: "accepted", requested_date: "2099-01-01" })],
    });
    expect(overview.courseSales).toBe(30000);
    expect(overview.totalEarnings).toBe(70000);
    expect(overview.productsSold).toBe(2);
    expect(overview.activeConsultations).toBe(1);
    expect(overview.totalStudents).toBe(3);
    expect(formatDashboardAmount(overview.totalEarnings, overview.currency)).toMatch(/70/);
  });

  it("wires the agriprofile dashboard to the overview action instead of mock KPIs", () => {
    const page = read("src/app/(dashboard)/dashboard/page.tsx");
    const action = read("src/lib/agriprofile/overview-actions.ts");
    expect(page).toContain("getAgriprofileOverviewAction");
    expect(page).toContain("formatDashboardAmount");
    expect(page).not.toContain("2.450.000");
    expect(page).not.toContain("1.250.000");
    expect(page).not.toContain("Amanhã, 09:00");
    expect(page).not.toContain("Visita Técnica • Fazenda Huambo");
    expect(action).toContain("await requireAuth()");
    expect(action).toContain("getSellerEarningsAction");
    expect(action).toContain("getSellerOrdersAction");
    expect(action).toContain("getProviderRequestsAction");
    expect(action).toContain("CourseService.listByOwner");
    expect(action).toContain("EnrollmentService.countActiveByCourseIds");
  });
});
