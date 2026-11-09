import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/clerk/auth";
import { courseRegistrationPath } from "@/lib/academy/course-registration";
import { getPublishedCourseForCommerce } from "@/lib/academy/commerce-contract";
import { addGuestCourse } from "@/lib/commerce/guest-cart";
import { applyGuestCartCookie, readGuestCart } from "@/lib/commerce/guest-cart-session";
import { CommerceService } from "@/lib/services/commerce-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const course = await getPublishedCourseForCommerce(courseId);
    if (!course || courseRegistrationPath(course.price) !== "cart") {
      return NextResponse.json({ success: false, code: "COURSE_NOT_AVAILABLE" }, { status: 403 });
    }

    const profile = await getCurrentUserProfile();
    if (profile) {
      await CommerceService.addCatalogCourse(courseId, { customerId: profile.id, persist: true });
      return NextResponse.json({ success: true, kind: "cart", next: "/cart" });
    }

    const lines = addGuestCourse(await readGuestCart(), courseId);
    return applyGuestCartCookie(
      NextResponse.json({ success: true, kind: "cart", next: "/cart" }),
      lines
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ success: false, code: "CART_FAILED", message }, { status: 500 });
  }
}
