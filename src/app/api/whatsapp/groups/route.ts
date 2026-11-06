import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isWhatsappGroupId } from "@/lib/integrations/waapi/groups";
import { requireWhatsappUser, whatsappErrorResponse } from "@/lib/whatsapp/http";
import { createWhatsappRuntime } from "@/lib/whatsapp/runtime";
import { WhatsappServiceError } from "@/lib/whatsapp/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const saveSchema = z.object({
  groupId: z.string().refine(isWhatsappGroupId),
});

export async function GET() {
  const access = await requireWhatsappUser();
  if ("response" in access) return access.response;
  try {
    const groups = await createWhatsappRuntime().listGroups(access.userId);
    return NextResponse.json({ groups });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const access = await requireWhatsappUser();
  if ("response" in access) return access.response;
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_GROUP" }, { status: 400 });
  }
  try {
    const groups = await createWhatsappRuntime().saveGroup(access.userId, parsed.data.groupId);
    return NextResponse.json({ groups });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireWhatsappUser();
  if ("response" in access) return access.response;
  const groupId = request.nextUrl.searchParams.get("groupId") || "";
  if (!isWhatsappGroupId(groupId)) {
    return NextResponse.json({ error: "INVALID_GROUP" }, { status: 400 });
  }
  try {
    const groups = await createWhatsappRuntime().removeGroup(access.userId, groupId);
    return NextResponse.json({ groups });
  } catch (error) {
    if (error instanceof WhatsappServiceError) return whatsappErrorResponse(error);
    return whatsappErrorResponse(error);
  }
}
