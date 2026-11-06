import { NextResponse } from "next/server";
import { AuthorizationError, authorizationStatus, requirePermission } from "@/lib/authorization";
import { getCurrentSubject } from "@/lib/authorization/server";
import { WhatsappServiceError } from "./types";

async function requirePermissions(
  permissions: Array<"whatsapp.connect" | "product.publish">
): Promise<{ userId: string } | { response: NextResponse }> {
  const subject = await getCurrentSubject();
  try {
    for (const permission of permissions) {
      requirePermission(subject, permission);
    }
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

export async function requireWhatsappUser(): Promise<
  { userId: string } | { response: NextResponse }
> {
  return requirePermissions(["whatsapp.connect"]);
}

export async function requireProductWhatsappPublisher(): Promise<
  { userId: string } | { response: NextResponse }
> {
  return requirePermissions(["whatsapp.connect", "product.publish"]);
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
