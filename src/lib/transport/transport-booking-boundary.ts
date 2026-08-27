import type { TransportRequestStatus } from "@/types/transport";

/**
 * Fix-Phase-11 commerce boundary.
 *
 * Transport Service owns the request/booking identity (`transport_requests`).
 * Acceptance confirms the booking immediately. Commerce owns future payment
 * and must not create a second order row for the same booking.
 */
export const TRANSPORT_BOOKING_TABLE = "transport_requests";
export const TRANSPORT_PAYMENT_STATE = "coming_soon" as const;

const COMMERCE_FIELDS = [
  "order_id",
  "order_number",
  "payment_id",
  "payment_intent_id",
  "checkout_id",
  "checkout_session_id",
] as const;

const PRIVATE_TRANSPORT_REQUEST_KEYS = [
  "email",
  "phone",
  "whatsapp_phone",
  "clerk_user_id",
  "subscription_plan",
  "student_email",
] as const;

export function isTransportPaymentEnabled(): boolean {
  return false;
}

export function transportRequestStatusPatch(status: TransportRequestStatus): { status: TransportRequestStatus } {
  return { status };
}

export function collectForbiddenTransportCommerceKeys(payload: unknown): string[] {
  const found = new Set<string>();

  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (
        (COMMERCE_FIELDS as readonly string[]).includes(key) ||
        (PRIVATE_TRANSPORT_REQUEST_KEYS as readonly string[]).includes(key)
      ) {
        found.add(key);
      }
      walk(nested);
    }
  };

  walk(payload);
  return [...found];
}
