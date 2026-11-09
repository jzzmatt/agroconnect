import { isCompletedPaidProductGroup, sellerGroupProductValue } from "@/lib/commerce/persist";
import type { AgriprofileOverview, AgriprofileUpcomingAppointment } from "@/types/agriprofile";
import type { ServiceRequestItem } from "@/types/agriexpert";
import type { CourseListItem } from "@/types/agriacademy";
import type { OrderDescriptor } from "@/types/commerce";

const ACTIVE_CONSULT_STATUSES = new Set(["pending", "accepted"]);

export function emptyAgriprofileOverview(): AgriprofileOverview {
  return {
    currency: "AOA",
    productEarnings: 0,
    courseSales: 0,
    totalEarnings: 0,
    activeConsultations: 0,
    productsSold: 0,
    totalStudents: 0,
    upcoming: [],
  };
}

export function formatDashboardAmount(value: number, currency = "AOA"): string {
  const amount = new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 2 }).format(Number(value) || 0);
  const code = String(currency || "AOA").trim().toUpperCase();
  return `${amount} ${code === "AOA" ? "Kz" : code}`;
}

export function countCompletedSoldUnits(orders: OrderDescriptor[]): number {
  let units = 0;
  for (const order of orders) {
    for (const group of order.seller_groups || []) {
      if (group.status === "cancelled" || order.status === "cancelled") continue;
      if (
        !isCompletedPaidProductGroup({
          paymentStatus: order.payment_status,
          fulfillmentStatus: group.status,
          orderStatus: order.status,
        })
      ) {
        continue;
      }
      const itemQty = (group.items || []).reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0
      );
      units += itemQty > 0 ? itemQty : 1;
    }
  }
  return units;
}

export function sumOwnedCourseStats(
  courses: Array<Pick<CourseListItem, "id" | "price" | "status">>,
  counts: Record<string, number>
): { courseSales: number; totalStudents: number } {
  let courseSales = 0;
  let totalStudents = 0;
  for (const course of courses) {
    if (course.status === "draft") continue;
    const students = Number(counts[course.id]) || 0;
    totalStudents += students;
    courseSales += (Number(course.price) || 0) * students;
  }
  return { courseSales, totalStudents };
}

export function countActiveConsultations(requests: ServiceRequestItem[]): number {
  return requests.filter((request) => ACTIVE_CONSULT_STATUSES.has(request.status)).length;
}

/** Product value of the same completed groups counted as products sold. */
export function sumSoldProductIncome(orders: OrderDescriptor[]): number {
  let total = 0;
  for (const order of orders) {
    for (const group of order.seller_groups || []) {
      if (group.status === "cancelled" || order.status === "cancelled") continue;
      if (
        !isCompletedPaidProductGroup({
          paymentStatus: order.payment_status,
          fulfillmentStatus: group.status,
          orderStatus: order.status,
        })
      ) {
        continue;
      }
      total += sellerGroupProductValue(group);
    }
  }
  return total;
}

/** Quoted price of pending and accepted consultations. */
export function sumActiveConsultationIncome(requests: ServiceRequestItem[]): number {
  return requests.reduce((sum, request) => {
    if (!ACTIVE_CONSULT_STATUSES.has(request.status)) return sum;
    return sum + Math.max(0, Number(request.estimated_price) || 0);
  }, 0);
}

function startOfLocalDay(now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

function parseRequestedAt(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function selectUpcomingAppointments(
  requests: ServiceRequestItem[],
  now = new Date(),
  limit = 5
): AgriprofileUpcomingAppointment[] {
  const today = startOfLocalDay(now);
  return requests
    .filter((request) => request.status === "accepted" && request.requested_date)
    .map((request) => {
      const requestedAt = parseRequestedAt(String(request.requested_date));
      if (!requestedAt || requestedAt < today) return null;
      const location = request.location_notes?.trim() || null;
      return {
        id: request.id,
        title: request.service_title?.trim() || "Serviço",
        requestedAt: String(request.requested_date),
        location,
      } satisfies AgriprofileUpcomingAppointment;
    })
    .filter((item): item is AgriprofileUpcomingAppointment => Boolean(item))
    .sort((a, b) => {
      const left = parseRequestedAt(a.requestedAt)?.getTime() ?? 0;
      const right = parseRequestedAt(b.requestedAt)?.getTime() ?? 0;
      return left - right;
    })
    .slice(0, limit);
}

export function buildAgriprofileOverview(input: {
  currency?: string;
  productEarnings: number;
  orders: OrderDescriptor[];
  courses: Array<Pick<CourseListItem, "id" | "price" | "status">>;
  enrollmentCounts: Record<string, number>;
  requests: ServiceRequestItem[];
  now?: Date;
}): AgriprofileOverview {
  const { courseSales, totalStudents } = sumOwnedCourseStats(
    input.courses,
    input.enrollmentCounts
  );
  const soldProductIncome = sumSoldProductIncome(input.orders);
  const recordedProductEarnings = Number(input.productEarnings) || 0;
  const productEarnings = input.orders.length > 0 ? soldProductIncome : recordedProductEarnings;
  const consultationIncome = sumActiveConsultationIncome(input.requests);
  return {
    currency: input.currency || "AOA",
    productEarnings,
    courseSales,
    totalEarnings: productEarnings + courseSales + consultationIncome,
    activeConsultations: countActiveConsultations(input.requests),
    productsSold: countCompletedSoldUnits(input.orders),
    totalStudents,
    upcoming: selectUpcomingAppointments(input.requests, input.now),
  };
}
