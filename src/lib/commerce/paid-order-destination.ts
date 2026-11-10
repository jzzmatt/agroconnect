export const MY_COURSES_PATH = "/dashboard/academy/my-courses";

type PaidLine = {
  course_id?: string | null;
  product_id?: string | null;
  product_slug?: string | null;
};

function uniqueSlugs(lines: PaidLine[]): string[] {
  const slugs: string[] = [];
  for (const line of lines) {
    const slug = String(line.product_slug || "").trim();
    if (!slug || slugs.includes(slug)) continue;
    slugs.push(slug);
  }
  return slugs;
}

function orderLines(order: {
  items?: PaidLine[] | null;
  seller_groups?: Array<{ items?: PaidLine[] | null }> | null;
}): PaidLine[] {
  if (Array.isArray(order.items) && order.items.length > 0) return order.items;
  return (order.seller_groups || []).flatMap((group) => group.items || []);
}

/** Where a confirmed payment should continue. Unpaid orders stay put. */
export function paidOrderDestination(order: {
  payment_status?: string | null;
  items?: PaidLine[] | null;
  seller_groups?: Array<{ items?: PaidLine[] | null }> | null;
} | null | undefined): string | null {
  if (!order || String(order.payment_status || "") !== "paid") return null;
  const lines = orderLines(order);
  const courses = lines.filter((line) => line.course_id);
  if (courses.length > 0) {
    const slugs = uniqueSlugs(courses);
    if (slugs.length === 1) {
      return `/agriacademy/courses/${encodeURIComponent(slugs[0])}/learn`;
    }
    return MY_COURSES_PATH;
  }
  const slugs = uniqueSlugs(lines.filter((line) => line.product_id || line.product_slug));
  if (slugs.length === 1) {
    return `/agrishopping/products/${encodeURIComponent(slugs[0])}`;
  }
  return null;
}
