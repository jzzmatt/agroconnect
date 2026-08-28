"use server";

import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import { getSellerEarningsAction, getSellerOrdersAction } from "@/lib/services/commerce-actions";
import { getProviderRequestsAction } from "@/lib/services/marketplace-actions";
import { CourseService } from "@/lib/services/course-service";
import { EnrollmentService } from "@/lib/services/enrollment-service";
import {
  buildAgriprofileOverview,
  emptyAgriprofileOverview,
} from "@/lib/agriprofile/overview";
import type { AgriprofileOverview } from "@/types/agriprofile";

/**
 * AgriProfile workspace aggregation. Reads Commerce, AgriAcademy and
 * AgriExpert through their public services — does not reimplement them.
 */
export async function getAgriprofileOverviewAction(): Promise<AgriprofileOverview> {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();

    const [earnings, orders, requests, courses] = await Promise.all([
      getSellerEarningsAction(),
      getSellerOrdersAction(),
      getProviderRequestsAction(),
      profile ? CourseService.listByOwner(profile.id, true) : Promise.resolve([]),
    ]);

    const enrollmentCounts = await EnrollmentService.countActiveByCourseIds(
      courses.filter((course) => course.status !== "draft").map((course) => course.id)
    );

    return buildAgriprofileOverview({
      currency: earnings.currency,
      productEarnings: earnings.total_earned,
      orders,
      courses,
      enrollmentCounts,
      requests,
    });
  } catch (error) {
    console.warn("[getAgriprofileOverviewAction]", error);
    return emptyAgriprofileOverview();
  }
}
