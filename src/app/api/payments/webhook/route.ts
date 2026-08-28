import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { PaymentService } from "@/lib/payments";
import { persistApplyPaymentWebhook } from "@/lib/commerce/persist";

/**
 * Payment webhook. Validates the provider secret, then records the event and
 * updates the matching payment/order. Duplicate provider event IDs are ignored.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headersList: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersList[key.toLowerCase()] = value;
    });

    const validation = await PaymentService.handleWebhook(rawBody, headersList);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || "Assinatura ou payload de webhook inválido." },
        { status: 401 }
      );
    }

    await persistApplyPaymentWebhook({
      eventId: validation.eventId,
      eventType: validation.eventType,
      provider: validation.provider,
      orderId: validation.orderId,
      providerPaymentId: validation.providerPaymentId,
      status: validation.status,
      amount: validation.amount,
      payloadHash: createHash("sha256").update(rawBody).digest("hex"),
    });

    return NextResponse.json({
      received: true,
      eventId: validation.eventId,
      status: validation.status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno ao processar webhook.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
