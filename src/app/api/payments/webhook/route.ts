import { NextResponse } from "next/server";
import { PaymentService } from "@/lib/payments";

/**
 * Payment Webhook Endpoint
 * Validates gateway signatures, idempotently updates payment and order records.
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
        { status: 400 }
      );
    }

    return NextResponse.json({
      received: true,
      eventId: validation.eventId,
      status: validation.status,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erro interno ao processar webhook." },
      { status: 500 }
    );
  }
}
