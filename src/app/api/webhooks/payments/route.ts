import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/lib/payments";
import { persistApplyPaymentWebhook } from "@/lib/commerce/persist";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const result = await PaymentService.handleWebhook(raw, headers);
  if (!result.isValid) {
    return NextResponse.json({ error: result.error || "Webhook de pagamento inválido." }, { status: 401 });
  }

  try {
    await persistApplyPaymentWebhook({
      eventId: result.eventId,
      eventType: result.eventType,
      provider: result.provider,
      orderId: result.orderId,
      providerPaymentId: result.providerPaymentId,
      status: result.status,
      amount: result.amount,
      payloadHash: createHash("sha256").update(raw).digest("hex"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao aplicar o evento de pagamento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
