import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isWhatsappGroupId } from "@/lib/integrations/waapi/groups";
import { isUuid } from "@/lib/products/ids";
import { requireCourseWhatsappPublisher, whatsappErrorResponse } from "@/lib/whatsapp/http";
import { createCoursePublishRuntime } from "@/lib/whatsapp/course-publish-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  groupIds: z.array(z.string().refine(isWhatsappGroupId)).min(1).max(30),
  clientRequestId: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  const access = await requireCourseWhatsappPublisher();
  if ("response" in access) return access.response;
  const { courseId } = await context.params;
  if (!isUuid(courseId)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  try {
    const publication = await createCoursePublishRuntime().publish(access.userId, {
      courseId,
      groupIds: parsed.data.groupIds,
      clientRequestId: parsed.data.clientRequestId,
    });
    return NextResponse.json({ publication });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
