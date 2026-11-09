import {
  getPublishedCourseForCommerce,
  grantEnrollmentForCommerce,
} from "@/lib/academy/commerce-contract";

const AMOUNT_TOLERANCE = 0.009;

/**
 * Full payment only. Pending, failed, cancelled, and partial amounts stay closed.
 * Paid rows are summed once and cannot be applied again by calling this twice.
 */
export function paymentCoversCourseOrder(params: {
  orderTotal: number;
  paymentStatus?: string | null;
  payments: Array<{ status?: string | null; amount?: number | null }>;
}): boolean {
  if (String(params.paymentStatus || "") !== "paid") return false;
  const payable = Number(params.orderTotal);
  if (!Number.isFinite(payable) || payable <= 0) return false;
  const received = params.payments
    .filter((payment) => String(payment.status || "") === "paid")
    .reduce((sum, payment) => sum + Math.max(0, Number(payment.amount) || 0), 0);
  return received + AMOUNT_TOLERANCE >= payable;
}

export async function settlePaidCourseOrder(input: {
  studentId: string;
  orderTotal: number;
  paymentStatus?: string | null;
  payments: Array<{ status?: string | null; amount?: number | null }>;
  courseIds: Array<string | null | undefined>;
}): Promise<{ enrolledCourseIds: string[] }> {
  if (!input.studentId?.trim() || !paymentCoversCourseOrder(input)) {
    return { enrolledCourseIds: [] };
  }
  const courseIds = [...new Set(input.courseIds.filter((courseId): courseId is string => Boolean(courseId)))];
  const enrolledCourseIds: string[] = [];
  for (const courseId of courseIds) {
    await completeAcademyCoursePurchase({ studentId: input.studentId, courseId });
    enrolledCourseIds.push(courseId);
  }
  return { enrolledCourseIds };
}

/**
 * Commerce entry point after a successful payment.
 * Grants the existing Academy enrollment. Does not play video, store video,
 * or record lesson-hosting financials.
 */
export async function completeAcademyCoursePurchase(input: {
  studentId: string;
  courseId: string;
}): Promise<{ enrollmentId: string; courseId: string; studentId: string }> {
  if (!input.studentId?.trim() || !input.courseId?.trim()) {
    throw new Error("Utilizador e curso são obrigatórios.");
  }

  const course = await getPublishedCourseForCommerce(input.courseId);
  if (!course) {
    throw new Error("Este curso não está disponível para inscrição.");
  }

  const enrollment = await grantEnrollmentForCommerce(input.studentId, input.courseId);
  return {
    enrollmentId: enrollment.id,
    courseId: enrollment.courseId,
    studentId: enrollment.studentId,
  };
}
