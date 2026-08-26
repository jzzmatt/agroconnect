import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/clerk/auth";
import { EnrollmentService } from "@/lib/services/enrollment-service";
import { CourseService } from "@/lib/services/course-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return NextResponse.json({ success: false, code: "AUTH_REQUIRED" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const courseId = String(body?.courseId || "");
    if (!courseId) {
      return NextResponse.json({ success: false, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const published = await CourseService.isCoursePublished(courseId);
    if (!published) {
      return NextResponse.json({ success: false, code: "COURSE_NOT_AVAILABLE" }, { status: 403 });
    }

    const existing = await EnrollmentService.isEnrolled(profile.id, courseId);
    const enrollment = await EnrollmentService.enroll(profile.id, courseId);

    return NextResponse.json({
      success: true,
      enrollment,
      alreadyEnrolled: existing,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { success: false, code: "ENROLLMENT_FAILED", message },
      { status: 500 }
    );
  }
}
