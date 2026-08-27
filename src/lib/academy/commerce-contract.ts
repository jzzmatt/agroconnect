import { CourseService } from "@/lib/services/course-service";
import { EnrollmentService } from "@/lib/services/enrollment-service";

/** Public Academy fields Commerce may read. No lessons, YouTube, or Bunny. */
export interface CommerceAcademyCourse {
  id: string;
  title: string;
  slug: string;
  price: number;
  currency: string;
}

/** Public enrollment fields Commerce may persist against. Same course_enrollments row. */
export interface CommerceAcademyEnrollment {
  id: string;
  courseId: string;
  studentId: string;
  status: "active";
}

export async function getPublishedCourseForCommerce(
  courseId: string
): Promise<CommerceAcademyCourse | null> {
  if (!courseId) return null;
  const published = await CourseService.isCoursePublished(courseId);
  if (!published) return null;

  const [course] = await CourseService.getCoursesByIds([courseId]);
  if (!course || course.status !== "published") return null;

  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    price: course.price,
    currency: course.currency,
  };
}

export async function grantEnrollmentForCommerce(
  studentId: string,
  courseId: string
): Promise<CommerceAcademyEnrollment> {
  if (!studentId || !courseId) {
    throw new Error("Utilizador e curso são obrigatórios.");
  }

  const course = await getPublishedCourseForCommerce(courseId);
  if (!course) {
    throw new Error("Este curso não está disponível para inscrição.");
  }

  const enrollment = await EnrollmentService.enroll(studentId, courseId);
  return {
    id: enrollment.id,
    courseId: enrollment.course_id,
    studentId: enrollment.student_id,
    status: "active",
  };
}
