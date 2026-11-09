import { getPublishedCourseForCommerce } from "@/lib/academy/commerce-contract";
import { CourseService } from "@/lib/services/course-service";
import type { CartItemDescriptor } from "@/types/commerce";

export interface PublishedCourseLine {
  courseId: string;
  title: string;
  slug: string;
  price: number;
  currency: string;
  sellerId: string;
  sellerName: string;
}

/** Server price for a published paid course. Free and unpublished courses are omitted. */
export async function publishedCourseLine(courseId: string): Promise<PublishedCourseLine | null> {
  const course = await getPublishedCourseForCommerce(courseId);
  if (!course || course.price <= 0) return null;
  const [full] = await CourseService.getCoursesByIds([courseId]);
  if (!full || full.status !== "published" || full.price <= 0 || !full.provider_id) return null;
  const sellerId = full.provider_id;
  return {
    courseId: course.id,
    title: course.title,
    slug: course.slug,
    price: course.price,
    currency: course.currency || "AOA",
    sellerId,
    sellerName: full.instructor_name || "Instrutor",
  };
}

export function courseCartItem(line: PublishedCourseLine, id: string): CartItemDescriptor {
  return {
    id,
    product_id: line.courseId,
    course_id: line.courseId,
    seller_id: line.sellerId,
    seller_name: line.sellerName,
    title: line.title,
    slug: line.slug,
    unit_price: line.price,
    quantity: 1,
    unit: "curso",
    subtotal: line.price,
    currency: line.currency,
    max_available_quantity: 1,
    is_available: true,
  };
}
