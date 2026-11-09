import { NextResponse } from "next/server";
import { isUuid } from "@/lib/products/ids";
import { requireCourseWhatsappPublisher, whatsappErrorResponse } from "@/lib/whatsapp/http";
import { createCoursePublishRuntime } from "@/lib/whatsapp/course-publish-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  const access = await requireCourseWhatsappPublisher();
  if ("response" in access) return access.response;
  const { courseId } = await context.params;
  if (!isUuid(courseId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    const preview = await createCoursePublishRuntime().preview(access.userId, courseId);
    return NextResponse.json(preview);
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
