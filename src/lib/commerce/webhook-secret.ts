const HEADER_NAMES = ["x-payment-webhook-secret", "x-agri-sandbox-webhook-secret"];

export const SANDBOX_DEV_WEBHOOK_SECRET = "sandbox-dev-secret";

export function resolvePaymentWebhookSecret(): string {
  const configured = (process.env.PAYMENT_WEBHOOK_SECRET || "").trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return "";
  return SANDBOX_DEV_WEBHOOK_SECRET;
}

export function readWebhookSecretHeader(headers: Record<string, string>): string {
  const entries = Object.entries(headers);
  for (const name of HEADER_NAMES) {
    const found = entries.find(([key]) => key.toLowerCase() === name);
    if (found?.[1]) return found[1];
  }
  return "";
}

export function paymentWebhookSecretMatches(headers: Record<string, string>): boolean {
  const expected = resolvePaymentWebhookSecret();
  if (!expected) return false;
  const provided = readWebhookSecretHeader(headers);
  return Boolean(provided) && provided === expected;
}
