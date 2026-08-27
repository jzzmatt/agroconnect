import {
  getPublishedCourseForCommerce,
  grantEnrollmentForCommerce,
} from "@/lib/academy/commerce-contract";

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
