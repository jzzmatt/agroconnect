import { NextResponse } from "next/server";
import { recordPublicVisit } from "@/lib/admin/data";
import { classifyPublicVisit } from "@/lib/analytics/public-visit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const visit = classifyPublicVisit({
      pathname: body && typeof body === "object" ? (body as { pathname?: unknown }).pathname : undefined,
      visitorId: body && typeof body === "object" ? (body as { visitorId?: unknown }).visitorId : undefined,
      userAgent: request.headers.get("user-agent"),
    });
    if (visit) await recordPublicVisit(visit);
  } catch {
    // A failed visit write must never affect the page that sent it.
  }
  return new NextResponse(null, { status: 204 });
}
