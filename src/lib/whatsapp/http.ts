import { NextResponse } from "next/server";
import { AuthorizationError, authorizationStatus, requirePermission } from "@/lib/authorization";
import { getCurrentSubject } from "@/lib/authorization/server";
import { WhatsappServiceError } from "./types";

export async function requireWhatsappUser(): Promise<
  { userId: string } | { response: NextResponse }
> {
  const subject = await getCurrentSubject();
  try {
    requirePermission(subject, "whatsapp.connect");
  } catch (error) {
    const status = authorizationStatus(error);
    if (status) {
      const code = error instanceof AuthorizationError ? error.code : "PERMISSION_DENIED";
      return { response: NextResponse.json({ error: code }, { status }) };
    }
    throw error;
  }
  return { userId: subject!.profileId };
}

export function whatsappErrorResponse(error: unknown): NextResponse {
  if (error instanceof WhatsappServiceError) {
    const headers = error.retryAfterMs
      ? { "Retry-After": String(Math.ceil(error.retryAfterMs / 1000)) }
      : undefined;
    return NextResponse.json({ error: error.code }, { status: error.status, headers });
  }
  console.error("[whatsapp] request failed");
  return NextResponse.json({ error: "UNEXPECTED" }, { status: 500 });
}
